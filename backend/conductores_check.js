// Script para mostrar los conductores únicos y su cantidad de inspecciones
const { getPrismaClient } = require('./src/config/database');

async function main() {
  const prisma = getPrismaClient();
  const results = await prisma.inspecciones.groupBy({
    by: ['conductor_nombre'],
    where: {
      conductor_nombre: {
        not: ''
      }
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 20
  });
  console.log('Conductores únicos y cantidad de inspecciones:');
  results.forEach(r => {
    console.log(`${r.conductor_nombre}: ${r._count.id}`);
  });
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
