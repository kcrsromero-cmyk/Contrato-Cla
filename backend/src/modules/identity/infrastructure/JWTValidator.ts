export class JWTValidator {
  private readonly jwksUrl: string;
  private jwks: any;

  constructor(jwksUrl: string) {
    this.jwksUrl = jwksUrl;
  }

  async verify(token: string): Promise<any> {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.jwksUrl));
    }

    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: ['ES256'],
    });
    return payload;
  }
}
