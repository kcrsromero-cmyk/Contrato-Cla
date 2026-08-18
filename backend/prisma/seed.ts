import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Capabilities
  const capabilities = [
    { name: 'USE_FAVORITES', description: 'Permite agregar y ver contratos favoritos' },
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

  // Fetch capabilities
  const useFavorites = await prisma.capability.findUnique({ where: { name: 'USE_FAVORITES' } });
  const viewSimilarity = await prisma.capability.findUnique({ where: { name: 'VIEW_SIMILARITY_ANALYSIS' } });

  // Fetch plans
  const starter = await prisma.plan.findUnique({ where: { name: 'STARTER' } });
  const profesional = await prisma.plan.findUnique({ where: { name: 'PROFESIONAL' } });
  const enterprise = await prisma.plan.findUnique({ where: { name: 'ENTERPRISE' } });

  // 3. Link Plans and Capabilities
  const planCapabilities = [];

  if (starter && useFavorites) planCapabilities.push({ planId: starter.id, capabilityId: useFavorites.id });

  if (profesional && useFavorites) planCapabilities.push({ planId: profesional.id, capabilityId: useFavorites.id });
  if (profesional && viewSimilarity) planCapabilities.push({ planId: profesional.id, capabilityId: viewSimilarity.id });

  if (enterprise && useFavorites) planCapabilities.push({ planId: enterprise.id, capabilityId: useFavorites.id });
  if (enterprise && viewSimilarity) planCapabilities.push({ planId: enterprise.id, capabilityId: viewSimilarity.id });

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