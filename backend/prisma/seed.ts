import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Capabilities
  const capabilities = [
    { name: 'USE_FAVORITES', description: 'Permite agregar y ver contratos favoritos' },
    { name: 'USE_ANALYTICS', description: 'Permite acceder a los tableros y consultas de analítica' },
    { name: 'USE_API', description: 'Permite crear claves de API y consumir la API de forma programática' },
    { name: 'VIEW_SIMILARITY_ANALYSIS', description: 'Permite ver análisis de similitud entre contratos' }
  ];

  for (const cap of capabilities) {
    await prisma.capability.upsert({
      where: { name: cap.name },
      update: {},
      create: cap,
    });
  }
  console.log('Capabilities seeded.');

  // 2. Create Plans
  const plansData = [
    { name: 'FREE', description: 'Plan gratuito básico', maxFavoriteEntities: 0 },
    { name: 'STARTER', description: 'Plan para usuarios iniciales', maxFavoriteEntities: 3 },
    { name: 'PROFESIONAL', description: 'Plan para usuarios profesionales', maxFavoriteEntities: 10 },
    { name: 'BUSINESS', description: 'Plan para negocios con analítica y acceso por API', maxFavoriteEntities: 25 },
    { name: 'ENTERPRISE', description: 'Plan para empresas con requerimientos avanzados', maxFavoriteEntities: null }
  ];

  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: { maxFavoriteEntities: plan.maxFavoriteEntities },
      create: plan,
    });
  }
  console.log('Plans seeded.');

  // 2b. API rate limits per plan (requests per minute per API key). Illustrative values, adjustable.
  // Only plans that grant USE_API get a value; every other plan keeps NULL.
  const apiRateLimits = [
    { name: 'BUSINESS', apiRequestsPerMinute: 60 },
    { name: 'ENTERPRISE', apiRequestsPerMinute: 600 },
  ];

  for (const limit of apiRateLimits) {
    await prisma.plan.update({
      where: { name: limit.name },
      data: { apiRequestsPerMinute: limit.apiRequestsPerMinute },
    });
  }
  console.log('API rate limits seeded.');

  // Fetch capabilities
  const useFavorites = await prisma.capability.findUnique({ where: { name: 'USE_FAVORITES' } });
  const viewSimilarity = await prisma.capability.findUnique({ where: { name: 'VIEW_SIMILARITY_ANALYSIS' } });
  const useAnalytics = await prisma.capability.findUnique({ where: { name: 'USE_ANALYTICS' } });
  const useApi = await prisma.capability.findUnique({ where: { name: 'USE_API' } });

  // Fetch plans
  const starter = await prisma.plan.findUnique({ where: { name: 'STARTER' } });
  const profesional = await prisma.plan.findUnique({ where: { name: 'PROFESIONAL' } });
  const business = await prisma.plan.findUnique({ where: { name: 'BUSINESS' } });
  const enterprise = await prisma.plan.findUnique({ where: { name: 'ENTERPRISE' } });

  // 3. Link Plans and Capabilities
  const planCapabilities = [];

  if (starter && useFavorites) planCapabilities.push({ planId: starter.id, capabilityId: useFavorites.id });

  if (profesional && useFavorites) planCapabilities.push({ planId: profesional.id, capabilityId: useFavorites.id });
  if (profesional && viewSimilarity) planCapabilities.push({ planId: profesional.id, capabilityId: viewSimilarity.id });
  if (profesional && useAnalytics) planCapabilities.push({ planId: profesional.id, capabilityId: useAnalytics.id });

  if (business && useFavorites) planCapabilities.push({ planId: business.id, capabilityId: useFavorites.id });
  if (business && viewSimilarity) planCapabilities.push({ planId: business.id, capabilityId: viewSimilarity.id });
  if (business && useAnalytics) planCapabilities.push({ planId: business.id, capabilityId: useAnalytics.id });
  if (business && useApi) planCapabilities.push({ planId: business.id, capabilityId: useApi.id });

  if (enterprise && useFavorites) planCapabilities.push({ planId: enterprise.id, capabilityId: useFavorites.id });
  if (enterprise && viewSimilarity) planCapabilities.push({ planId: enterprise.id, capabilityId: viewSimilarity.id });
  if (enterprise && useAnalytics) planCapabilities.push({ planId: enterprise.id, capabilityId: useAnalytics.id });
  if (enterprise && useApi) planCapabilities.push({ planId: enterprise.id, capabilityId: useApi.id });

  for (const pc of planCapabilities) {
    await prisma.planCapability.upsert({
      where: {
        planId_capabilityId: {
          planId: pc.planId,
          capabilityId: pc.capabilityId,
        }
      },
      update: {},
      create: pc,
    });
  }
  console.log('Plan capabilities linked.');

  // 3b. Feature flags — operational kill switches, default-open. `update: {}` never
  // re-enables a flag an operator disabled, so re-running the seed is safe.
  const featureFlags = [
    { key: 'NOTIFICATIONS', description: 'Rutas /api/v1/notifications (Telegram)' },
    { key: 'ANALYTICS', description: 'Rutas /api/v1/analytics' },
    { key: 'API_ACCESS', description: 'Autenticación con claves de API (Authorization: Bearer ctr360_)' },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: { key: flag.key, enabled: true, description: flag.description },
    });
  }
  console.log('Feature flags seeded.');

  // 4. Create Territorial Data
  const territorialData = [
    { department: "Amazonas", cities: ["Leticia", "Puerto Nariño", "No Definido"] },
    { department: "Antioquia", cities: ["Medellín", "Bello", "Envigado", "Itagüí", "No Definido"] },
    { department: "Arauca", cities: ["Arauca", "Arauquita", "No Definido"] },
    { department: "Atlántico", cities: ["Barranquilla", "Soledad", "Malambo", "No Definido"] },
    { department: "Bolívar", cities: ["Cartagena", "Magangué", "No Definido"] },
    { department: "Boyacá", cities: ["Tunja", "Duitama", "Sogamoso", "No Definido"] },
    { department: "Caldas", cities: ["Manizales", "La Dorada", "No Definido"] },
    { department: "Caquetá", cities: ["Florencia", "San Vicente Del Caguán", "El Doncello", "El Paujil", "Albania", "Belén De Los Andaquies", "Cartagena Del Chairá", "Curillo", "La Montañita", "Milán", "Morelia", "Puerto Rico", "San José Del Fragua", "Solano", "Valparaíso", "No Definido"] },
    { department: "Casanare", cities: ["Yopal", "Aguazul", "No Definido"] },
    { department: "Cauca", cities: ["Popayán", "Santander de Quilichao", "No Definido"] },
    { department: "Cesar", cities: ["Valledupar", "Aguachica", "No Definido"] },
    { department: "Chocó", cities: ["Quibdó", "No Definido"] },
    { department: "Córdoba", cities: ["Montería", "Tierralta", "No Definido"] },
    { department: "Cundinamarca", cities: ["Soacha", "Fusagasugá", "Zipaquirá", "No Definido"] },
    { department: "Distrito Capital de Bogotá", cities: ["Bogotá", "No Definido"] },
    { department: "Guainía", cities: ["Puerto Inírida", "No Definido"] },
    { department: "Guaviare", cities: ["San José del Guaviare", "No Definido"] },
    { department: "Huila", cities: ["Neiva", "Pitalito", "Garzón", "No Definido"] },
    { department: "La Guajira", cities: ["Riohacha", "Maicao", "No Definido"] },
    { department: "Magdalena", cities: ["Santa Marta", "Ciénaga", "No Definido"] },
    { department: "Meta", cities: ["Villavicencio", "Acacías", "No Definido"] },
    { department: "Nariño", cities: ["Pasto", "Tumaco", "No Definido"] },
    { department: "Norte de Santander", cities: ["Cúcuta", "Ocaña", "No Definido"] },
    { department: "No Definido", cities: ["No Definido"] },
    { department: "Putumayo", cities: ["Mocoa", "Puerto Asís", "No Definido"] },
    { department: "Quindío", cities: ["Armenia", "No Definido"] },
    { department: "Risaralda", cities: ["Pereira", "Dosquebradas", "No Definido"] },
    { department: "San Andrés y Providencia", cities: ["San Andrés", "No Definido"] },
    { department: "Santander", cities: ["Bucaramanga", "Barrancabermeja", "No Definido"] },
    { department: "Sucre", cities: ["Sincelejo", "No Definido"] },
    { department: "Tolima", cities: ["Ibagué", "Espinal", "No Definido"] },
    { department: "Valle del Cauca", cities: ["Cali", "Buenaventura", "Guadalajara de Buga", "Palmira", "Tuluá", "No Definido"] },
    { department: "Vaupés", cities: ["Mitú", "No Definido"] },
    { department: "Vichada", cities: ["Puerto Carreño", "No Definido"] },
  ];

  for (const deptData of territorialData) {
    const dept = await prisma.department.upsert({
      where: { name: deptData.department },
      update: {},
      create: { name: deptData.department },
    });

    for (const cityName of deptData.cities) {
      await prisma.city.upsert({
        where: {
          departmentId_name: {
            departmentId: dept.id,
            name: cityName,
          }
        },
        update: {},
        create: {
          name: cityName,
          departmentId: dept.id,
        },
      });
    }
  }
  console.log('Territorial data seeded.');

  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
