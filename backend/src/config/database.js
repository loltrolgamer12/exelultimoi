// 🗄️ CONFIGURACIÓN DE BASE DE DATOS CON PRISMA
// src/config/database.js

const { PrismaClient } = require('@prisma/client');

// 🔧 Configuración del cliente Prisma
const prismaConfig = {
  // Configuración de logging basada en entorno
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn']
    : ['query', 'info', 'warn', 'error'],
    
  // Configuración de errores
  errorFormat: 'pretty',
  
  // Configuración de conexiones para mejor rendimiento
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
};

// 🏭 Singleton del cliente Prisma
let prisma;

// 🔗 Función para crear conexión
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno');
  }

  console.log('[DB] Creando cliente Prisma...');
  console.log('[DB] Database URL configurada:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  const client = new PrismaClient(prismaConfig);
  
  // 📊 Event listeners para monitoreo
  client.$on('query', (e) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DB-QUERY] ${e.query} - ${e.duration}ms`);
    }
  });
  
  client.$on('error', (e) => {
    console.error('[DB-ERROR]', e);
  });
  
  client.$on('warn', (e) => {
    console.warn('[DB-WARN]', e);
  });
  
  // 🔌 Hook de conexión
  client.$connect()
    .then(() => console.log('[DB] ✅ Cliente Prisma conectado exitosamente'))
    .catch((error) => console.error('[DB] ❌ Error conectando cliente Prisma:', error));
  
  return client;
};

// 🔗 Función para obtener o crear cliente
const getPrismaClient = () => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

// 🚀 Función de conexión a la base de datos
const connectDatabase = async () => {
  try {
    const client = getPrismaClient();
    
    // Verificar conexión con una query simple
    await client.$queryRaw`SELECT 1 as connected`;
    
    console.log('[DB] ✅ Conexión a la base de datos verificada');
    
    // 🧪 Verificar si las tablas existen
    try {
      await client.inspeccion.count();
      console.log('[DB] ✅ Tablas de la base de datos accesibles');
    } catch (error) {
      console.warn('[DB] ⚠️  Las tablas pueden no existir aún. Ejecuta: npx prisma db push');
    }
    
    return client;
  } catch (error) {
    console.error('[DB] ❌ Error conectando a la base de datos:', error);
    throw new Error(`Error de conexión a la base de datos: ${error.message}`);
  }
};

// 🔌 Función de desconexión
const disconnectDatabase = async () => {
  if (prisma) {
    try {
      await prisma.$disconnect();
      console.log('[DB] 🔌 Base de datos desconectada');
      prisma = null;
    } catch (error) {
      console.error('[DB] ❌ Error desconectando la base de datos:', error);
    }
  }
};

// 🧪 Función de health check de la base de datos
const databaseHealthCheck = async () => {
  try {
    const startTime = Date.now();
    const client = getPrismaClient();
    
    // Test de conectividad básico
    await client.$queryRaw`SELECT 1 as health_check`;
    const responseTime = Date.now() - startTime;
    
    // Test de conteo de registros
    const totalInspecciones = await client.inspeccion.count();
    const totalArchivos = await client.archivosProcesados.count();
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      totalInspecciones,
      totalArchivos,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// 🔄 Función para reiniciar conexión si es necesario
const reconnectDatabase = async () => {
  console.log('[DB] 🔄 Reiniciando conexión a la base de datos...');
  
  try {
    await disconnectDatabase();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
    return await connectDatabase();
  } catch (error) {
    console.error('[DB] ❌ Error reiniciando la base de datos:', error);
    throw error;
  }
};

// 📊 Función para obtener estadísticas de la base de datos
const getDatabaseStats = async () => {
  try {
    const client = getPrismaClient();
    
    const stats = await Promise.all([
      client.inspeccion.count(),
      client.inspeccion.count({ where: { tiene_alerta_roja: true } }),
      client.inspeccion.count({ where: { tiene_advertencias: true } }),
      client.historialConductor.count(),
      client.archivosProcesados.count()
    ]);
    
    return {
      totalInspecciones: stats[0],
      alertasRojas: stats[1], 
      advertencias: stats[2],
      conductores: stats[3],
      archivos: stats[4],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DB] Error obteniendo estadísticas:', error);
    return null;
  }
};

// 🧹 Función de limpieza y optimización
const optimizeDatabase = async () => {
  try {
    const client = getPrismaClient();
    
    console.log('[DB] 🧹 Iniciando optimización de base de datos...');
    
    // Eliminar archivos procesados antiguos (más de 90 días)
    const fecha90Dias = new Date();
    fecha90Dias.setDate(fecha90Dias.getDate() - 90);
    
    const archivosEliminados = await client.archivosProcesados.deleteMany({
      where: {
        fecha_procesamiento: {
          lt: fecha90Dias
        }
      }
    });
    
    console.log(`[DB] 🗑️  Eliminados ${archivosEliminados.count} archivos antiguos`);
    
    // Actualizar métricas
    await client.metricasReporte.deleteMany({
      where: {
        fecha_reporte: {
          lt: fecha90Dias
        }
      }
    });
    
    console.log('[DB] ✅ Optimización completada');
    
    return {
      archivosEliminados: archivosEliminados.count,
      fecha: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DB] ❌ Error durante la optimización:', error);
    throw error;
  }
};

// 🧪 Testing de queries para desarrollo
const testDatabaseQueries = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('[DB] Tests de queries deshabilitados en producción');
    return;
  }
  
  try {
    const client = getPrismaClient();
    
    console.log('[DB] 🧪 Ejecutando tests de queries...');
    
    // Test 1: Query básica
    const basicQuery = await client.inspeccion.findMany({
      take: 1
    });
    
    // Test 2: Query con relaciones
    const relationQuery = await client.inspeccion.findFirst({
      include: {
        historial: true
      }
    });
    
    // Test 3: Agregaciones
    const aggregateQuery = await client.inspeccion.aggregate({
      _count: true,
      _avg: {
        puntaje_total: true
      }
    });
    
    console.log('[DB] ✅ Tests de queries exitosos');
    console.log('[DB] Basic query count:', basicQuery.length);
    console.log('[DB] Aggregate result:', aggregateQuery);
    
  } catch (error) {
    console.error('[DB] ❌ Error en tests de queries:', error);
  }
};

module.exports = {
  getPrismaClient,
  connectDatabase,
  disconnectDatabase,
  databaseHealthCheck,
  reconnectDatabase,
  getDatabaseStats,
  optimizeDatabase,
  testDatabaseQueries
};