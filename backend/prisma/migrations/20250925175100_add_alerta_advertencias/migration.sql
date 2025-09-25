-- CreateEnum
CREATE TYPE "EstadoInspeccion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION', 'ALERTA_ROJA', 'ADVERTENCIA');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateTable
CREATE TABLE "inspecciones" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "marca_temporal" DOUBLE PRECISION NOT NULL,
    "nombre_inspector" VARCHAR(200) NOT NULL,
    "contrato" VARCHAR(100) NOT NULL,
    "campo_coordinacion" VARCHAR(100) NOT NULL,
    "placa_vehiculo" VARCHAR(20) NOT NULL,
    "kilometraje" INTEGER NOT NULL,
    "turno" VARCHAR(20) NOT NULL,
    "altas_bajas" BOOLEAN NOT NULL,
    "direccionales" BOOLEAN NOT NULL,
    "parqueo" BOOLEAN NOT NULL,
    "freno" BOOLEAN NOT NULL,
    "reversa_alarma" BOOLEAN NOT NULL,
    "espejos" BOOLEAN NOT NULL,
    "vidrio_frontal" BOOLEAN NOT NULL,
    "orden_aseo" BOOLEAN NOT NULL,
    "pito" BOOLEAN NOT NULL,
    "gps" BOOLEAN NOT NULL,
    "frenos" BOOLEAN NOT NULL,
    "freno_emergencia" BOOLEAN NOT NULL,
    "cinturones" BOOLEAN NOT NULL,
    "puertas" BOOLEAN NOT NULL,
    "vidrios" BOOLEAN NOT NULL,
    "limpia_brisas" BOOLEAN NOT NULL,
    "extintor_vigente" BOOLEAN NOT NULL,
    "botiquin" BOOLEAN NOT NULL,
    "tapiceria" BOOLEAN NOT NULL,
    "indicadores" BOOLEAN NOT NULL,
    "objetos_sueltos" BOOLEAN NOT NULL,
    "aceite_motor" BOOLEAN NOT NULL,
    "fluido_frenos" BOOLEAN NOT NULL,
    "fluido_direccion" BOOLEAN NOT NULL,
    "fluido_refrigerante" BOOLEAN NOT NULL,
    "fluido_limpia_parabrisas" BOOLEAN NOT NULL,
    "correas" BOOLEAN NOT NULL,
    "baterias" BOOLEAN NOT NULL,
    "llantas_labrado" BOOLEAN NOT NULL,
    "llantas_sin_cortes" BOOLEAN NOT NULL,
    "llanta_repuesto" BOOLEAN NOT NULL,
    "copas_pernos_llantas" BOOLEAN NOT NULL,
    "suspension" BOOLEAN NOT NULL,
    "direccion_terminales" BOOLEAN NOT NULL,
    "tapa_tanque" BOOLEAN NOT NULL,
    "equipo_carretera" BOOLEAN NOT NULL,
    "kit_ambiental" BOOLEAN NOT NULL,
    "documentacion" BOOLEAN NOT NULL,
    "observaciones" TEXT,
    "horas_sueno" BOOLEAN NOT NULL,
    "libre_fatiga" BOOLEAN NOT NULL,
    "condiciones_aptas" BOOLEAN NOT NULL,
    "consumo_medicamentos" BOOLEAN NOT NULL,
    "placa_vehiculo_extra" VARCHAR(20),
    "tiene_alerta_roja" BOOLEAN NOT NULL DEFAULT false,
    "tiene_advertencias" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_conductores" (
    "id" TEXT NOT NULL,
    "conductor_nombre" VARCHAR(200) NOT NULL,
    "total_inspecciones" INTEGER NOT NULL DEFAULT 0,
    "alertas_rojas_total" INTEGER NOT NULL DEFAULT 0,
    "advertencias_total" INTEGER NOT NULL DEFAULT 0,
    "ultima_inspeccion" TIMESTAMP(3),
    "promedio_riesgo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dias_sin_incidentes" INTEGER NOT NULL DEFAULT 0,
    "inspeccionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historial_conductores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_reportes" (
    "id" TEXT NOT NULL,
    "fecha_reporte" DATE NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "total_inspecciones" INTEGER NOT NULL DEFAULT 0,
    "total_conductores" INTEGER NOT NULL DEFAULT 0,
    "total_vehiculos" INTEGER NOT NULL DEFAULT 0,
    "alertas_rojas" INTEGER NOT NULL DEFAULT 0,
    "advertencias" INTEGER NOT NULL DEFAULT 0,
    "inspecciones_exitosas" INTEGER NOT NULL DEFAULT 0,
    "conductores_medicamentos" INTEGER NOT NULL DEFAULT 0,
    "conductores_poco_sueno" INTEGER NOT NULL DEFAULT 0,
    "conductores_con_sintomas" INTEGER NOT NULL DEFAULT 0,
    "conductores_no_aptos" INTEGER NOT NULL DEFAULT 0,
    "metricas_por_contrato" JSONB,
    "metricas_por_campo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metricas_reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_procesados" (
    "id" TEXT NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "hash_archivo" VARCHAR(64) NOT NULL,
    "ano_detectado" INTEGER NOT NULL,
    "meses_detectados" INTEGER[],
    "total_registros" INTEGER NOT NULL DEFAULT 0,
    "registros_nuevos" INTEGER NOT NULL DEFAULT 0,
    "registros_duplicados" INTEGER NOT NULL DEFAULT 0,
    "estado_procesamiento" VARCHAR(50) NOT NULL DEFAULT 'PROCESADO',
    "tiempo_procesamiento" DOUBLE PRECISION,
    "errores_validacion" JSONB,
    "advertencias" JSONB,
    "fecha_procesamiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_carga" VARCHAR(100),

    CONSTRAINT "archivos_procesados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspecciones_marca_temporal_turno_idx" ON "inspecciones"("marca_temporal", "turno");

-- CreateIndex
CREATE INDEX "inspecciones_placa_vehiculo_idx" ON "inspecciones"("placa_vehiculo");

-- CreateIndex
CREATE INDEX "inspecciones_contrato_campo_coordinacion_idx" ON "inspecciones"("contrato", "campo_coordinacion");

-- CreateIndex
CREATE INDEX "inspecciones_fecha_turno_idx" ON "inspecciones"("fecha", "turno");

-- CreateIndex
CREATE INDEX "metricas_reportes_ano_mes_idx" ON "metricas_reportes"("ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_reportes_fecha_reporte_ano_mes_key" ON "metricas_reportes"("fecha_reporte", "ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "archivos_procesados_hash_archivo_key" ON "archivos_procesados"("hash_archivo");

-- CreateIndex
CREATE INDEX "archivos_procesados_ano_detectado_idx" ON "archivos_procesados"("ano_detectado");

-- CreateIndex
CREATE INDEX "archivos_procesados_fecha_procesamiento_idx" ON "archivos_procesados"("fecha_procesamiento");

-- AddForeignKey
ALTER TABLE "historial_conductores" ADD CONSTRAINT "historial_conductores_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "inspecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
