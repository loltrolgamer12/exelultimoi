// 📄 ARCHIVO: backend/debug-database.js
// 🔍 Script para debuggear problemas de base de datos

const { getPrismaClient } = require('./src/config/database');

async function debugDatabase() {
  console.log('🔍 =======================================');
  console.log('🔍 DEBUGGING BASE DE DATOS');
  console.log('🔍 =======================================\n');

  const prisma = getPrismaClient();

  try {
    // 1. Probar conexión
    console.log('1. 🔗 Probando conexión a base de datos...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Conexión exitosa\n');

    // 2. Verificar estructura de tabla inspecciones
    console.log('2. 📊 Verificando estructura de tabla "inspecciones"...');
    
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'inspecciones'
        ORDER BY ordinal_position;
      `;
      
      console.log('   📋 Columnas encontradas en tabla "inspecciones":');
      tableInfo.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      console.log('');

      // 3. Verificar campos críticos
      const criticalFields = ['placa_vehiculo', 'contrato', 'turno', 'conductor_nombre', 'fecha'];
      console.log('3. 🎯 Verificando campos críticos...');
      
      const existingFields = tableInfo.map(col => col.column_name);
      criticalFields.forEach(field => {
        const exists = existingFields.includes(field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTE' : 'FALTANTE'}`);
      });
      console.log('');

    } catch (structureError) {
      console.error('   ❌ Error verificando estructura:', structureError.message);
      console.log('   💡 La tabla "inspecciones" podría no existir\n');
    }

    // 4. Contar registros existentes
    console.log('4. 📊 Contando registros existentes...');
    try {
      const count = await prisma.inspecciones.count();
      console.log(`   📊 Total de registros en inspecciones: ${count}\n`);
      
      if (count > 0) {
        // Mostrar algunos registros de ejemplo
        const samples = await prisma.inspecciones.findMany({
          take: 3,
          select: {
            id: true,
            placa_vehiculo: true,
            contrato: true,
            turno: true,
            createdAt: true
          }
        });
        
        console.log('   📋 Registros de ejemplo:');
        samples.forEach((record, index) => {
          console.log(`   ${index + 1}. ID: ${record.id}, Placa: ${record.placa_vehiculo}, Contrato: ${record.contrato}`);
        });
        console.log('');
      }
    } catch (countError) {
      console.error('   ❌ Error contando registros:', countError.message);
      console.log('   💡 Problema accediendo a la tabla "inspecciones"\n');
    }

    // 5. Probar inserción de prueba
    console.log('5. 🧪 Probando inserción de registro de prueba...');
    try {
      const testRecord = {
        id: 'test-' + Date.now().toString(36),
        fecha: new Date(),
        conductor_nombre: 'TEST CONDUCTOR',
        placa_vehiculo: 'TEST123',
        contrato: 'TEST-CONTRACT',
        turno: 'TEST-TURNO',
        campo_coordinacion: 'TEST',
        kilometraje: 12345,
        marca_temporal: Date.now(),
        nivel_riesgo: 'BAJO',
        puntaje_total: 85,
        observaciones: 'Registro de prueba para debug',
        
        // Campos boolean por defecto
        gps: true,
        pito: true,
        freno: true,
        frenos: true,
        correas: true,
        espejos: true,
        parqueo: true,
        puertas: true,
        vidrios: true,
        baterias: true,
        tapiceria: true,
        cinturones: true,
        orden_aseo: true,
        suspension: true,
        altas_bajas: true,
        horas_sueno: true,
        indicadores: true,
        tapa_tanque: true,
        aceite_motor: true,
        libre_fatiga: true,
        direccionales: true,
        documentacion: true,
        fluido_frenos: true,
        kit_ambiental: true,
        limpia_brisas: true,
        espejos_estado: 'BUENO'
      };

      console.log('   🔄 Insertando registro de prueba...');
      const inserted = await prisma.inspecciones.create({
        data: testRecord
      });
      
      console.log(`   ✅ Registro insertado exitosamente: ID ${inserted.id}`);
      
      // Verificar que se insertó
      const found = await prisma.inspecciones.findUnique({
        where: { id: inserted.id }
      });
      
      if (found) {
        console.log(`   ✅ Registro confirmado en BD: ${found.placa_vehiculo}`);
        
        // Eliminar registro de prueba
        await prisma.inspecciones.delete({
          where: { id: inserted.id }
        });
        console.log('   🗑️ Registro de prueba eliminado');
      } else {
        console.log('   ❌ Registro no encontrado después de insertar');
      }
      
      console.log('');
      
    } catch (insertError) {
      console.error('   ❌ Error insertando registro de prueba:', insertError.message);
      console.error('   🔍 Código de error:', insertError.code);
      
      if (insertError.code === 'P2002') {
        console.log('   💡 Error de duplicado - el campo único ya existe');
      } else if (insertError.code === 'P2000') {
        console.log('   💡 Error de valor - campo con valor inválido');
      } else if (insertError.code === 'P2025') {
        console.log('   💡 Error de registro no encontrado');
      } else {
        console.log('   💡 Revisar schema de Prisma y migraciones');
      }
      console.log('');
    }

    // 6. Verificar tabla de archivos procesados
    console.log('6. 📁 Verificando tabla "archivos_procesados"...');
    try {
      const filesCount = await prisma.archivos_procesados.count();
      console.log(`   📊 Total de archivos procesados: ${filesCount}`);
      
      if (filesCount > 0) {
        const recentFiles = await prisma.archivos_procesados.findMany({
          take: 3,
          orderBy: { fecha_procesamiento: 'desc' },
          select: {
            id: true,
            nombre_archivo: true,
            total_registros: true,
            registros_insertados: true,
            estado: true,
            fecha_procesamiento: true
          }
        });
        
        console.log('   📋 Archivos recientes:');
        recentFiles.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.nombre_archivo} - ${file.registros_insertados}/${file.total_registros} insertados - ${file.estado}`);
        });
      }
      console.log('');
      
    } catch (filesError) {
      console.error('   ❌ Error verificando archivos procesados:', filesError.message);
      console.log('   💡 La tabla "archivos_procesados" podría no existir\n');
    }

    // 7. Verificar configuración de Prisma
    console.log('7. ⚙️ Verificando configuración de Prisma...');
    console.log(`   📋 DATABASE_URL configurada: ${process.env.DATABASE_URL ? 'SÍ' : 'NO'}`);
    console.log(`   📋 Prisma Client version: ${prisma._clientVersion || 'Desconocida'}`);
    console.log('');

  } catch (globalError) {
    console.error('❌ Error global:', globalError.message);
    console.error('🔍 Stack trace:', globalError.stack);
  } finally {
    await prisma.$disconnect();
    console.log('🔍 =======================================');
    console.log('🔍 DEBUG COMPLETADO');
    console.log('🔍 =======================================\n');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugDatabase().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { debugDatabase };