/*
  Warnings:

  - You are about to drop the column `estado_procesamiento` on the `archivos_procesados` table. All the data in the column will be lost.
  - You are about to drop the column `meses_detectados` on the `archivos_procesados` table. All the data in the column will be lost.
  - You are about to drop the column `registros_nuevos` on the `archivos_procesados` table. All the data in the column will be lost.
  - You are about to drop the column `advertencias_total` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `alertas_rojas_total` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `conductor_nombre` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `dias_sin_incidentes` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `promedio_riesgo` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `total_inspecciones` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `ultima_inspeccion` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `historial_conductores` table. All the data in the column will be lost.
  - You are about to drop the column `botiquin` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `condiciones_aptas` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `consumo_medicamentos` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `copas_pernos_llantas` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `direccion_terminales` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `equipo_carretera` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `extintor_vigente` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `fluido_direccion` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `fluido_limpia_parabrisas` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `fluido_refrigerante` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `freno_emergencia` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `llanta_repuesto` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `llantas_labrado` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `llantas_sin_cortes` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_inspector` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `objetos_sueltos` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `placa_vehiculo_extra` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `reversa_alarma` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `tiene_advertencias` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `tiene_alerta_roja` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to drop the column `vidrio_frontal` on the `inspecciones` table. All the data in the column will be lost.
  - You are about to alter the column `marca_temporal` on the `inspecciones` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `BigInt`.
  - You are about to drop the `metricas_reportes` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `observaciones` on table `inspecciones` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "inspecciones_contrato_campo_coordinacion_idx";

-- DropIndex
DROP INDEX "inspecciones_fecha_turno_idx";

-- DropIndex
DROP INDEX "inspecciones_marca_temporal_turno_idx";

-- AlterTable
ALTER TABLE "archivos_procesados" DROP COLUMN "estado_procesamiento",
DROP COLUMN "meses_detectados",
DROP COLUMN "registros_nuevos",
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'PROCESADO',
ADD COLUMN     "registros_error" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "registros_insertados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tamano_archivo" INTEGER,
ALTER COLUMN "nombre_archivo" SET DATA TYPE TEXT,
ALTER COLUMN "hash_archivo" SET DATA TYPE TEXT,
ALTER COLUMN "ano_detectado" DROP NOT NULL,
ALTER COLUMN "usuario_carga" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "historial_conductores" DROP COLUMN "advertencias_total",
DROP COLUMN "alertas_rojas_total",
DROP COLUMN "conductor_nombre",
DROP COLUMN "createdAt",
DROP COLUMN "dias_sin_incidentes",
DROP COLUMN "promedio_riesgo",
DROP COLUMN "total_inspecciones",
DROP COLUMN "ultima_inspeccion",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "inspecciones" DROP COLUMN "botiquin",
DROP COLUMN "condiciones_aptas",
DROP COLUMN "consumo_medicamentos",
DROP COLUMN "copas_pernos_llantas",
DROP COLUMN "direccion_terminales",
DROP COLUMN "equipo_carretera",
DROP COLUMN "extintor_vigente",
DROP COLUMN "fluido_direccion",
DROP COLUMN "fluido_limpia_parabrisas",
DROP COLUMN "fluido_refrigerante",
DROP COLUMN "freno_emergencia",
DROP COLUMN "llanta_repuesto",
DROP COLUMN "llantas_labrado",
DROP COLUMN "llantas_sin_cortes",
DROP COLUMN "nombre_inspector",
DROP COLUMN "objetos_sueltos",
DROP COLUMN "placa_vehiculo_extra",
DROP COLUMN "reversa_alarma",
DROP COLUMN "tiene_advertencias",
DROP COLUMN "tiene_alerta_roja",
DROP COLUMN "vidrio_frontal",
ADD COLUMN     "conductor_nombre" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "espejos_estado" TEXT NOT NULL DEFAULT 'BUENO',
ADD COLUMN     "nivel_riesgo" TEXT NOT NULL DEFAULT 'BAJO',
ADD COLUMN     "puntaje_total" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "fecha" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fecha" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "marca_temporal" SET DEFAULT 0,
ALTER COLUMN "marca_temporal" SET DATA TYPE BIGINT,
ALTER COLUMN "contrato" SET DATA TYPE TEXT,
ALTER COLUMN "campo_coordinacion" SET DEFAULT '',
ALTER COLUMN "campo_coordinacion" SET DATA TYPE TEXT,
ALTER COLUMN "placa_vehiculo" SET DATA TYPE TEXT,
ALTER COLUMN "kilometraje" SET DEFAULT 0,
ALTER COLUMN "turno" SET DATA TYPE TEXT,
ALTER COLUMN "altas_bajas" SET DEFAULT false,
ALTER COLUMN "direccionales" SET DEFAULT false,
ALTER COLUMN "parqueo" SET DEFAULT false,
ALTER COLUMN "freno" SET DEFAULT false,
ALTER COLUMN "espejos" SET DEFAULT false,
ALTER COLUMN "orden_aseo" SET DEFAULT false,
ALTER COLUMN "pito" SET DEFAULT false,
ALTER COLUMN "gps" SET DEFAULT false,
ALTER COLUMN "frenos" SET DEFAULT false,
ALTER COLUMN "cinturones" SET DEFAULT false,
ALTER COLUMN "puertas" SET DEFAULT false,
ALTER COLUMN "vidrios" SET DEFAULT false,
ALTER COLUMN "limpia_brisas" SET DEFAULT false,
ALTER COLUMN "tapiceria" SET DEFAULT false,
ALTER COLUMN "indicadores" SET DEFAULT false,
ALTER COLUMN "aceite_motor" SET DEFAULT false,
ALTER COLUMN "fluido_frenos" SET DEFAULT false,
ALTER COLUMN "correas" SET DEFAULT false,
ALTER COLUMN "baterias" SET DEFAULT false,
ALTER COLUMN "suspension" SET DEFAULT false,
ALTER COLUMN "tapa_tanque" SET DEFAULT false,
ALTER COLUMN "kit_ambiental" SET DEFAULT false,
ALTER COLUMN "documentacion" SET DEFAULT false,
ALTER COLUMN "observaciones" SET NOT NULL,
ALTER COLUMN "observaciones" SET DEFAULT '',
ALTER COLUMN "horas_sueno" SET DEFAULT false,
ALTER COLUMN "libre_fatiga" SET DEFAULT false;

-- DropTable
DROP TABLE "metricas_reportes";

-- DropEnum
DROP TYPE "EstadoInspeccion";

-- DropEnum
DROP TYPE "NivelRiesgo";

-- CreateIndex
CREATE INDEX "inspecciones_contrato_idx" ON "inspecciones"("contrato");

-- CreateIndex
CREATE INDEX "inspecciones_fecha_idx" ON "inspecciones"("fecha");

-- CreateIndex
CREATE INDEX "inspecciones_marca_temporal_idx" ON "inspecciones"("marca_temporal");
