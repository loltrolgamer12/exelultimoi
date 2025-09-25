// 📊 SCRIPTS DE INICIALIZACIÓN DE BASE DE DATOS
// scripts/init-database.js

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// 🚀 **FUNCIÓN PRINCIPAL DE INICIALIZACIÓN**
async function initializeDatabase() {
  console.log('🚀 Iniciando configuración de base de datos...\n');
  
  try {
    // 1. Verificar conexión
    await verifyConnection();
    
    // 2. Crear tablas si no existen
    await ensureTablesExist();
    
    // 3. Insertar datos iniciales
    await seedInitialData();
    
    // 4. Crear índices adicionales
    await createAdditionalIndexes();
    
    // 5. Verificar integridad
    await verifyDataIntegrity();
    
    console.log('\n✅ Base de datos inicializada correctamente!');
    console.log('📊 Sistema listo para procesar inspecciones vehiculares\n');
    
  } catch (error) {
    console.error('\n❌ Error inicializando base de datos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 🔌 **VERIFICAR CONEXIÓN A BASE DE DATOS**
async function verifyConnection() {
  console.log('🔌 Verificando conexión a base de datos...');
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión establecida correctamente');
    
    // Mostrar información de la base de datos
    const dbInfo = await prisma.$queryRaw`
      SELECT version() as version, 
             current_database() as database,
             current_user as user
    `;
    
    console.log(`📊 Base de datos: ${dbInfo[0].database}`);
    console.log(`👤 Usuario: ${dbInfo[0].user}`);
    console.log(`🗃️  PostgreSQL: ${dbInfo[0].version.split(' ')[1]}`);
    
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    throw error;
  }
}

// 🏗️ **ASEGURAR QUE LAS TABLAS EXISTAN**
async function ensureTablesExist() {
  console.log('\n🏗️ Verificando estructura de tablas...');
  
  try {
    // Verificar tabla principal
    const inspectionTable = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'inspecciones'
    `;
    
    if (inspectionTable.length === 0) {
      console.log('⚠️  Tabla inspecciones no encontrada. Ejecutando migración...');
      // En producción, esto debería manejarse con prisma migrate
      console.log('💡 Ejecuta: npx prisma db push');
      throw new Error('Estructura de base de datos no encontrada. Ejecuta "npx prisma db push" primero.');
    }
    
    console.log('✅ Estructura de tablas verificada');
    
    // Contar tablas existentes
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log(`📊 Tablas encontradas: ${tableCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error.message);
    throw error;
  }
}

// 🌱 **INSERTAR DATOS INICIALES (SEED)**
async function seedInitialData() {
  console.log('\n🌱 Insertando datos iniciales...');
  
  try {
    // Verificar si ya hay datos
    const existingData = await prisma.inspeccion.count();
    
    if (existingData > 0) {
      console.log(`ℹ️  Ya existen ${existingData} registros. Omitiendo seed de datos.`);
      return;
    }
    
    // Insertar datos de muestra
    const sampleData = await createSampleInspections();
    
    if (process.env.NODE_ENV !== 'production') {
      const result = await prisma.inspeccion.createMany({
        data: sampleData,
        skipDuplicates: true
      });
      
      console.log(`✅ Insertados ${result.count} registros de muestra`);
      
      // Crear métricas iniciales
      await createInitialMetrics();
      
    } else {
      console.log('🔒 Producción detectada. Omitiendo datos de muestra.');
    }
    
  } catch (error) {
    console.error('❌ Error insertando datos iniciales:', error.message);
    // No lanzar error aquí, los datos de muestra son opcionales
  }
}

// 📈 **CREAR INSPECCIONES DE MUESTRA**
async function createSampleInspections() {
  const inspections = [];
  const today = new Date();
  
  // Generar inspecciones para los últimos 30 días
  for (let i = 0; i < 100; i++) {
    const fecha = new Date(today);
    fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 30));
    
    const isProblematic = Math.random() < 0.15; // 15% con problemas
    const hasCriticalIssue = Math.random() < 0.03; // 3% críticos
    
    inspections.push({
      fecha: fecha,
      hora: `${Math.floor(Math.random() * 16) + 6}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      turno: ['MAÑANA', 'TARDE', 'NOCHE'][Math.floor(Math.random() * 3)],
      ano: fecha.getFullYear(),
      mes: fecha.getMonth() + 1,
      
      // Conductor
      conductor_nombre: `Conductor ${i + 1}`,
      conductor_cedula: `${1000000 + i}`,
      conductor_licencia: `L${String(i).padStart(6, '0')}`,
      
      // Vehículo
      placa_vehiculo: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 900) + 100}`,
      tipo_vehiculo: ['CAMIONETA', 'CAMION', 'AUTOMOVIL', 'VAN'][Math.floor(Math.random() * 4)],
      marca_vehiculo: ['TOYOTA', 'CHEVROLET', 'FORD', 'NISSAN'][Math.floor(Math.random() * 4)],
      
      // Ubicación
      contrato: `CONTRATO-${Math.floor(Math.random() * 5) + 1}`,
      campo: `CAMPO-${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
      empresa_contratista: ['EMPRESA A', 'EMPRESA B', 'EMPRESA C'][Math.floor(Math.random() * 3)],
      
      // 🚨 FATIGA DEL CONDUCTOR
      consumo_medicamentos: hasCriticalIssue,
      horas_sueno_suficientes: !isProblematic || Math.random() > 0.3,
      libre_sintomas_fatiga: !isProblematic || Math.random() > 0.4,
      condiciones_aptas: !isProblematic || Math.random() > 0.2,
      
      // Inspección vehículo
      luces_funcionando: !isProblematic || Math.random() > 0.7,
      frenos_funcionando: !isProblematic || Math.random() > 0.8,
      kit_carretera: !isProblematic || Math.random() > 0.6,
      extintor_vigente: !isProblematic || Math.random() > 0.5,
      botiquin_completo: !isProblematic || Math.random() > 0.6,
      
      // Estados
      neumaticos_estado: isProblematic && Math.random() < 0.3 ? 'MALO' : 'BUENO',
      direccion_estado: isProblematic && Math.random() < 0.2 ? 'MALO' : 'BUENO',
      espejos_estado: isProblematic && Math.random() < 0.25 ? 'MALO' : 'BUENO',
      cinturones_estado: isProblematic && Math.random() < 0.15 ? 'MALO' : 'BUENO',
      
      // Observaciones ocasionales
      observaciones: i % 10 === 0 ? `Observación de muestra para inspección ${i + 1}` : null,
      inspector_nombre: `Inspector ${Math.floor(Math.random() * 5) + 1}`,
      
      // Cálculos automáticos
      tiene_alerta_roja: hasCriticalIssue,
      tiene_advertencias: isProblematic && !hasCriticalIssue,
      nivel_riesgo: hasCriticalIssue ? 'CRITICO' : isProblematic ? 'ALTO' : Math.random() < 0.1 ? 'MEDIO' : 'BAJO',
      estado_inspeccion: hasCriticalIssue ? 'ALERTA_ROJA' : isProblematic ? 'ADVERTENCIA' : 'APROBADO',
      puntaje_total: hasCriticalIssue ? Math.random() * 30 + 20 : 
                     isProblematic ? Math.random() * 25 + 60 : 
                     Math.random() * 20 + 80
    });
  }
  
  return inspections;
}

// 📊 **CREAR MÉTRICAS INICIALES**
async function createInitialMetrics() {
  console.log('📊 Creando métricas iniciales...');
  
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    // Contar datos actuales
    const stats = await prisma.inspeccion.aggregate({
      _count: { id: true },
      _sum: {
        tiene_alerta_roja: true,
        tiene_advertencias: true,
        consumo_medicamentos: true
      }
    });
    
    // Crear registro de métricas
    await prisma.metricasReporte.create({
      data: {
        fecha_reporte: today,
        ano: currentYear,
        mes: currentMonth,
        total_inspecciones: stats._count.id,
        alertas_rojas: stats._sum.tiene_alerta_roja || 0,
        advertencias: stats._sum.tiene_advertencias || 0,
        inspecciones_exitosas: stats._count.id - (stats._sum.tiene_alerta_roja || 0) - (stats._sum.tiene_advertencias || 0),
        conductores_medicamentos: stats._sum.consumo_medicamentos || 0
      }
    });
    
    console.log('✅ Métricas iniciales creadas');
    
  } catch (error) {
    console.error('⚠️  Error creando métricas iniciales:', error.message);
    // No lanzar error, las métricas son opcionales
  }
}

// 🔧 **CREAR ÍNDICES ADICIONALES**
async function createAdditionalIndexes() {
  console.log('\n🔧 Verificando índices de base de datos...');
  
  try {
    // Los índices ya están definidos en el schema de Prisma
    // Aquí podríamos agregar índices adicionales si es necesario
    
    // Verificar índices existentes
    const indexes = await prisma.$queryRaw`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'inspecciones'
      ORDER BY indexname
    `;
    
    console.log(`✅ Índices encontrados: ${indexes.length}`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
  } catch (error) {
    console.error('⚠️  Error verificando índices:', error.message);
    // No lanzar error, es informativo
  }
}

// ✅ **VERIFICAR INTEGRIDAD DE DATOS**
async function verifyDataIntegrity() {
  console.log('\n✅ Verificando integridad de datos...');
  
  try {
    // Verificar registros básicos
    const totalRecords = await prisma.inspeccion.count();
    const recordsWithDate = await prisma.inspeccion.count({
      where: { fecha: { not: null } }
    });
    const recordsWithDriver = await prisma.inspeccion.count({
      where: { conductor_nombre: { not: '' } }
    });
    
    console.log(`📊 Total registros: ${totalRecords}`);
    console.log(`📅 Con fecha: ${recordsWithDate} (${Math.round(recordsWithDate/totalRecords*100)}%)`);
    console.log(`👨‍💼 Con conductor: ${recordsWithDriver} (${Math.round(recordsWithDriver/totalRecords*100)}%)`);
    
    // Verificar alertas
    const alertasRojas = await prisma.inspeccion.count({
      where: { tiene_alerta_roja: true }
    });
    const advertencias = await prisma.inspeccion.count({
      where: { tiene_advertencias: true }
    });
    
    console.log(`🚨 Alertas rojas: ${alertasRojas}`);
    console.log(`⚠️  Advertencias: ${advertencias}`);
    
    // Verificar consistencia de fechas
    const inconsistentDates = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM inspecciones 
      WHERE EXTRACT(YEAR FROM fecha) != ano 
         OR EXTRACT(MONTH FROM fecha) != mes
    `;
    
    if (inconsistentDates[0].count > 0) {
      console.log(`⚠️  Fechas inconsistentes encontradas: ${inconsistentDates[0].count}`);
    } else {
      console.log('✅ Consistencia de fechas verificada');
    }
    
  } catch (error) {
    console.error('⚠️  Error verificando integridad:', error.message);
    // No lanzar error, es informativo
  }
}

// 🧹 **FUNCIÓN DE LIMPIEZA**
async function cleanupDatabase() {
  console.log('🧹 Iniciando limpieza de base de datos...');
  
  try {
    // Limpiar datos de prueba muy antiguos (más de 90 días)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    if (process.env.NODE_ENV !== 'production') {
      const deleted = await prisma.inspeccion.deleteMany({
        where: {
          AND: [
            { fecha: { lt: ninetyDaysAgo } },
            { observaciones: { contains: 'muestra' } }
          ]
        }
      });
      
      console.log(`🗑️  Eliminados ${deleted.count} registros antiguos de muestra`);
    }
    
    // Limpiar archivos procesados antiguos
    const deletedFiles = await prisma.archivosProcesados.deleteMany({
      where: {
        fecha_procesamiento: { lt: ninetyDaysAgo }
      }
    });
    
    console.log(`📁 Eliminados ${deletedFiles.count} registros de archivos antiguos`);
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
  }
}

// 📊 **OBTENER ESTADÍSTICAS DE LA BASE DE DATOS**
async function getDatabaseStats() {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as total_rows,
        n_tup_upd as updated_rows,
        n_tup_del as deleted_rows,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_tup_ins DESC
    `;
    
    console.log('\n📊 Estadísticas de base de datos:');
    stats.forEach(table => {
      console.log(`  ${table.tablename}: ${table.total_rows} registros (${table.table_size})`);
    });
    
    return stats;
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error.message);
    return [];
  }
}

// 🚀 **EJECUTAR SCRIPT SI SE LLAMA DIRECTAMENTE**
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      initializeDatabase();
      break;
    case 'cleanup':
      cleanupDatabase().then(() => prisma.$disconnect());
      break;
    case 'stats':
      getDatabaseStats().then(() => prisma.$disconnect());
      break;
    case 'verify':
      verifyConnection().then(() => {
        verifyDataIntegrity().then(() => prisma.$disconnect());
      });
      break;
    default:
      console.log(`
🚀 Scripts de Base de Datos - Sistema HQ-FO-40

Uso: node scripts/init-database.js <comando>

Comandos disponibles:
  init      - Inicializar base de datos completa
  cleanup   - Limpiar datos antiguos
  stats     - Mostrar estadísticas de BD
  verify    - Verificar conexión e integridad

Ejemplos:
  node scripts/init-database.js init
  node scripts/init-database.js stats
  node scripts/init-database.js cleanup
      `);
  }
}

// 📤 **EXPORTACIONES**
module.exports = {
  initializeDatabase,
  cleanupDatabase,
  getDatabaseStats,
  verifyConnection,
  verifyDataIntegrity,
  createSampleInspections
};