// 📄 ARCHIVO: backend/src/config/database.js
// 🔧 Configuración de conexión a base de datos con Prisma

const { PrismaClient } = require('@prisma/client');

let prisma = null;

/**
 * Obtener instancia singleton de PrismaClient
 * @returns {PrismaClient} Instancia de Prisma
 */
function getPrismaClient() {
  if (!prisma) {
    console.log('[DB] Inicializando cliente Prisma...');
    
    // Verificar que la URL de la base de datos esté configurada
    if (!process.env.DATABASE_URL) {
      console.error('[DB] ❌ DATABASE_URL no está configurada en las variables de entorno');
      throw new Error('DATABASE_URL es requerida');
    }
    
    // Log de la URL (ocultando credenciales)
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
    console.log('[DB] Database URL configurada:', maskedUrl);
    
    try {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
        errorFormat: 'pretty'
      });
      
      console.log('[DB] ✅ Cliente Prisma inicializado correctamente');
      
      // Configurar middleware de logging para queries lentas
      if (process.env.NODE_ENV === 'development') {
        prisma.$use(async (params, next) => {
          const start = Date.now();
          const result = await next(params);
          const end = Date.now();
          const time = end - start;
          
          if (time > 1000) { // Queries que toman más de 1 segundo
            console.log(`[DB] 🐌 Query lenta detectada: ${params.model}.${params.action} - ${time}ms`);
          }
          
          return result;
        });
      }
      
    } catch (error) {
      console.error('[DB] ❌ Error inicializando Prisma:', error);
      throw error;
    }
  }
  
  return prisma;
}

/**
 * Probar conexión a la base de datos
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
async function testConnection() {
  try {
    console.log('[DB] 🔍 Probando conexión a la base de datos...');
    
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    
    console.log('[DB] ✅ Conexión a base de datos exitosa');
    return true;
  } catch (error) {
    console.error('[DB] ❌ Error de conexión a base de datos:', error.message);
    return false;
  }
}

/**
 * Cerrar conexión a la base de datos
 */
async function closeConnection() {
  if (prisma) {
    try {
      console.log('[DB] 🔄 Cerrando conexión a base de datos...');
      await prisma.$disconnect();
      prisma = null;
      console.log('[DB] ✅ Conexión cerrada correctamente');
    } catch (error) {
      console.error('[DB] ❌ Error cerrando conexión:', error);
    }
  }
}

/**
 * Verificar estado de las tablas principales
 * @returns {Promise<Object>} Estado de las tablas
 */
async function checkDatabaseHealth() {
  try {
    const client = getPrismaClient();
    
    console.log('[DB] 🔍 Verificando salud de la base de datos...');
    
    // Verificar que las tablas principales existan
    const tableChecks = await Promise.allSettled([
      client.inspecciones.count(),
      client.archivos_procesados.count().catch(() => 0) // Esta tabla podría no existir aún
    ]);
    
    const inspecciones = tableChecks[0].status === 'fulfilled' ? tableChecks[0].value : 0;
    const archivos = tableChecks[1].status === 'fulfilled' ? tableChecks[1].value : 0;
    
    const health = {
      connected: true,
      tables: {
        inspecciones: {
          exists: tableChecks[0].status === 'fulfilled',
          count: inspecciones
        },
        archivos_procesados: {
          exists: tableChecks[1].status === 'fulfilled',
          count: archivos
        }
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('[DB] ✅ Verificación de salud completada:', health);
    return health;
    
  } catch (error) {
    console.error('[DB] ❌ Error verificando salud de BD:', error);
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Ejecutar migraciones pendientes (si las hay)
 */
async function runMigrations() {
  try {
    console.log('[DB] 🔄 Verificando migraciones...');
    
    // En producción, las migraciones deberían ejecutarse manualmente
    if (process.env.NODE_ENV === 'production') {
      console.log('[DB] ⚠️ En producción - migraciones deben ejecutarse manualmente');
      return;
    }
    
    // En desarrollo, podemos intentar aplicar migraciones
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      console.log('[DB] 🔄 Ejecutando: npx prisma migrate deploy...');
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
      
      if (stdout) console.log('[DB] 📝 Migraciones:', stdout);
      if (stderr) console.error('[DB] ⚠️ Avisos:', stderr);
      
      console.log('[DB] ✅ Migraciones aplicadas');
    } catch (migrationError) {
      console.log('[DB] ⚠️ No se pudieron ejecutar migraciones automáticamente');
      console.log('[DB] 💡 Ejecuta manualmente: npx prisma migrate deploy');
    }
    
  } catch (error) {
    console.error('[DB] ❌ Error en migraciones:', error);
  }
}

/**
 * Limpiar cache de consultas
 */
async function clearCache() {
  try {
    if (prisma) {
      // Prisma no tiene cache explícito, pero podemos reinicializar la conexión
      await closeConnection();
      getPrismaClient();
      console.log('[DB] ✅ Cache limpiado (conexión reinicializada)');
    }
  } catch (error) {
    console.error('[DB] ❌ Error limpiando cache:', error);
  }
}

// 🔧 **MANEJO DE EVENTOS DE PROCESO**
process.on('beforeExit', async () => {
  await closeConnection();
});

process.on('SIGINT', async () => {
  await closeConnection();
});

process.on('SIGTERM', async () => {
  await closeConnection();
});

module.exports = {
  getPrismaClient,
  testConnection,
  closeConnection,
  checkDatabaseHealth,
  runMigrations,
  clearCache
};