import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../infrastructure/db/prisma', () => ({
  prisma: {
    contract: { findUnique: vi.fn(), findMany: vi.fn() },
    favoriteContract: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    favoriteEntity: { count: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    plan: { findUnique: vi.fn() },
  },
}));

import { prisma as mockPrisma } from '../infrastructure/db/prisma';
import { parseTrustProxy, resolveJwtIssuer } from '../infrastructure/config/env';
import { SupabaseIdentityProvider } from '../modules/identity/infrastructure/SupabaseIdentityProvider';
import { JWTValidator } from '../modules/identity/infrastructure/JWTValidator';
import { AuthMiddleware } from '../modules/identity/presentation/AuthMiddleware';
import { maskEmail } from '../modules/identity/presentation/AuthController';
import { toPublicContract, ProcurementService } from '../modules/procurement/application/ProcurementService';
import { SocrataContractProvider } from '../modules/procurement/infrastructure/SocrataContractProvider';
import { ProcurementController } from '../modules/procurement/presentation/ProcurementController';
import { Contract } from '../modules/procurement/domain/types';

const mockRes = () => {
  const res: Partial<Response> = { send: vi.fn(), json: vi.fn(), status: vi.fn().mockReturnThis() };
  return res as Response;
};

describe('Config helpers', () => {
  it('parseTrustProxy convierte números, booleanos y listas', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8');
  });

  it('resolveJwtIssuer deriva el emisor de Supabase desde la URL del JWKS', () => {
    expect(resolveJwtIssuer('https://abc.supabase.co/auth/v1/.well-known/jwks.json'))
      .toBe('https://abc.supabase.co/auth/v1');
    expect(resolveJwtIssuer('https://x/.well-known/jwks.json', 'https://issuer.example.com/'))
      .toBe('https://issuer.example.com');
  });
});

describe('SupabaseIdentityProvider — sin estado compartido (hallazgo #1)', () => {
  const makeClient = () => ({
    auth: {
      admin: { signOut: vi.fn().mockResolvedValue({ data: null, error: null }) },
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
          user: { id: 'u1', email: 'a@b.co' },
        },
        error: null,
      }),
    },
  });

  it('logout revoca la sesión del JWT recibido, no la sesión guardada en el cliente', async () => {
    const client = makeClient();
    const provider = new SupabaseIdentityProvider(() => client as any);

    await provider.logout('jwt-del-usuario-A');

    expect(client.auth.admin.signOut).toHaveBeenCalledWith('jwt-del-usuario-A', 'local');
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it('usa un cliente nuevo por operación (sin sesión compartida entre usuarios)', async () => {
    const factory = vi.fn(makeClient);
    const provider = new SupabaseIdentityProvider(factory as any);

    await provider.login({ email: 'a@b.co', password: 'x' });
    await provider.logout('jwt');

    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory.mock.results[0].value).not.toBe(factory.mock.results[1].value);
  });

  it('el cliente por defecto se crea sin persistencia ni auto-refresh', async () => {
    const provider = new SupabaseIdentityProvider();
    const client: any = (provider as any).client;
    expect(client.auth.persistSession).toBe(false);
    expect(client.auth.autoRefreshToken).toBe(false);
  });
});

describe('JWTValidator — issuer y audience (hallazgo #11)', () => {
  const ISSUER = 'https://proj.supabase.co/auth/v1';
  let signToken: (claims: Record<string, unknown>) => Promise<string>;

  beforeEach(async () => {
    const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };

    vi.stubGlobal('fetch', vi.fn(async () =>
      new globalThis.Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { 'content-type': 'application/json' } })
    ));

    signToken = (claims) =>
      new SignJWT({ sub: 'u1', ...claims })
        .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey);
  });

  afterEach(() => vi.unstubAllGlobals());

  const validator = () =>
    new JWTValidator(`${ISSUER}/.well-known/jwks.json`, { issuer: ISSUER, audience: 'authenticated' });

  it('acepta un token con iss y aud correctos', async () => {
    const token = await signToken({ iss: ISSUER, aud: 'authenticated' });
    await expect(validator().verify(token)).resolves.toMatchObject({ sub: 'u1' });
  });

  it('rechaza un token de otro emisor', async () => {
    const token = await signToken({ iss: 'https://otro.supabase.co/auth/v1', aud: 'authenticated' });
    await expect(validator().verify(token)).rejects.toThrow();
  });

  it('rechaza un token con otra audiencia', async () => {
    const token = await signToken({ iss: ISSUER, aud: 'anon' });
    await expect(validator().verify(token)).rejects.toThrow();
  });

  it('AuthMiddleware responde 401 genérico sin filtrar el detalle de jose', async () => {
    const token = await signToken({ iss: 'https://otro/auth/v1', aud: 'authenticated' });
    const res = mockRes();
    const next = vi.fn();
    await new AuthMiddleware(validator()).handle(
      { headers: { authorization: `Bearer ${token}` } } as any, res, next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
  });
});

describe('toPublicContract — enmascaramiento de documentos (hallazgo #3)', () => {
  const base: Contract = {
    contractId: 'CO1.PCCNTR.1',
    entityCode: '700000001',
    supplierDocument: '1234567890',
    supplierDocumentType: 'Cédula de Ciudadanía',
    supervisorDocument: '98765432',
    supervisorDocumentType: 'Cédula de Ciudadanía',
    legalRepDocument: '11112222',
    legalRepDocumentType: 'Cédula de Ciudadanía',
    legalRepName: 'Rep Legal',
  } as Contract;

  it('elimina los números en claro y expone solo la versión enmascarada', () => {
    const out = toPublicContract(base);
    const json = JSON.stringify(out);

    expect(out).not.toHaveProperty('supplierDocument');
    expect(out).not.toHaveProperty('supervisorDocument');
    expect(out).not.toHaveProperty('legalRepDocument');
    expect(json).not.toContain('1234567890');
    expect(json).not.toContain('98765432');
    expect(json).not.toContain('11112222');
    expect(out.supplierDocumentDisplay).toBe('12345*****');
    expect(out.supervisorDocumentDisplay).toBe('98765***');
    expect(out.supplierDocumentType).toBe('Cédula de Ciudadanía');
  });

  it('no enmascara el NIT de personas jurídicas', () => {
    const out = toPublicContract({ ...base, supplierDocument: '900123456', supplierDocumentType: 'NIT' });
    expect(out.supplierDocumentDisplay).toBe('900123456');
  });

  it('tolera contratos sin documentos', () => {
    const out = toPublicContract({ contractId: 'x', entityCode: 'y' } as Contract);
    expect(out.supplierDocumentDisplay).toBeUndefined();
  });
});

describe('SocrataContractProvider — construcción segura de la URL (hallazgo #5)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const captureUrl = async (run: (p: SocrataContractProvider) => Promise<unknown>) => {
    const fetchMock = vi.fn(async () => new globalThis.Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await run(new SocrataContractProvider());
    return new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
  };

  it('un "&" en el código de entidad no puede añadir parámetros SoQL', async () => {
    const url = await captureUrl((p) =>
      p.fetchContracts({ codigoEntidad: "1&$limit=999999&x='", fechaDesde: '2024-01-01', fechaHasta: '2024-12-31' })
    );
    expect(url.searchParams.getAll('$limit')).toEqual(['5000']);
    expect(url.searchParams.get('$where')).toContain("codigo_entidad='1&$limit=999999&x='''");
  });

  it('getCities codifica el departamento con caracteres especiales', async () => {
    const url = await captureUrl((p) => p.getCities('San Andrés, Providencia & Santa Catalina#'));
    expect(url.searchParams.get('$where')).toBe("departamento='San Andrés, Providencia & Santa Catalina#'");
    expect(url.searchParams.get('$limit')).toBe('1000');
  });

  it('getContractYears mantiene la consulta de agregación', async () => {
    const url = await captureUrl((p) => p.getContractYears('700000001'));
    expect(url.searchParams.get('$select')).toBe('date_extract_y(fecha_de_firma) as anio');
    expect(url.searchParams.get('$group')).toBe('anio');
    expect(url.searchParams.get('$where')).toBe("codigo_entidad='700000001' and fecha_de_firma IS NOT NULL");
  });
});

describe('ProcurementController — validación de entradas (hallazgos #5 y #13)', () => {
  let controller: ProcurementController;
  let service: ProcurementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProcurementService(new SocrataContractProvider());
    controller = new ProcurementController(service);
  });

  it('rechaza códigos de entidad con caracteres de inyección', async () => {
    const spy = vi.spyOn(service, 'getContracts').mockResolvedValue([]);
    const res = mockRes();
    await controller.getContracts(
      { query: { codigoEntidad: '1&$limit=1', fechaDesde: '2024-01-01', fechaHasta: '2024-12-31' } } as any, res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('acepta un código de entidad real de SECOP', async () => {
    const spy = vi.spyOn(service, 'getContracts').mockResolvedValue([]);
    const res = mockRes();
    await controller.getContracts(
      { query: { codigoEntidad: '702729500', fechaDesde: '2024-01-01', fechaHasta: '2024-12-31' } } as any, res
    );
    expect(spy).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it.each(['Bogotá D.C.', 'San Andrés, Providencia y Santa Catalina', 'No Definido', "Cartagena De Indias"])(
    'acepta el nombre territorial real "%s"', async (name) => {
      const spy = vi.spyOn(service, 'getCities').mockResolvedValue([]);
      const res = mockRes();
      await controller.getCities({ query: { department: name } } as any, res);
      expect(spy).toHaveBeenCalledWith(name);
    }
  );

  it('rechaza nombres territoriales con caracteres de control o inyección', async () => {
    const spy = vi.spyOn(service, 'getCities').mockResolvedValue([]);
    const res = mockRes();
    await controller.getCities({ query: { department: 'Antioquia&$limit=1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rechaza búsquedas de más de 100 caracteres', async () => {
    const res = mockRes();
    await controller.searchEntities({ query: { q: 'a'.repeat(101) } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('addFavorite responde 409 (no 500) si el favorito ya existe', async () => {
    (mockPrisma.contract.findUnique as any).mockResolvedValue({ id: 'c1' });
    (mockPrisma.favoriteContract.create as any).mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
    const res = mockRes();
    await controller.addFavorite(
      { user: { id: 'u1', capabilities: ['USE_FAVORITES'] }, body: { contractId: 'CO1.PCCNTR.7735414' } } as any, res
    );
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('addFavoriteEntity rechaza entityName demasiado largo', async () => {
    const res = mockRes();
    await controller.addFavoriteEntity(
      { user: { id: 'u1', plan: 'PRO' }, body: { entityCode: '702729500', entityName: 'x'.repeat(301) } } as any, res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.favoriteEntity.upsert).not.toHaveBeenCalled();
  });
});

describe('maskEmail — auditoría de login fallido (hallazgo #14)', () => {
  it('enmascara la parte local del email', () => {
    expect(maskEmail('Juan.Perez@Example.com')).toBe('ju***@example.com');
  });
  it('devuelve null para valores que no son email', () => {
    expect(maskEmail(undefined)).toBeNull();
    expect(maskEmail('sin-arroba')).toBeNull();
  });
});
