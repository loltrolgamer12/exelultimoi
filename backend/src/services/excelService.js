// 📄 ARCHIVO: backend/src/services/excelService.js
// 🔧 VERSIÓN LIMPIA Y FUNCIONAL DE LA CLASE EXCELSERVICE

const XLSX = require('xlsx');
const ValidationService = require('./validationService');
const crypto = require('crypto');

class ExcelService {
  constructor() {
    this.validationService = new ValidationService();
    this.columnMapping = {
      placa_vehiculo: [
        "PLACA DEL VEHICULO", "PLACA DEL VEHÍCULO", "Placa del vehículo", "PLACA_VEHICULO", "Placa", "PLACA", "placa_vehiculo", "Número de placa", "No. Placa"
      ],
      contrato: [
        "CONTRATO", "Contrato", "contrato", "CONTRATO/CAMPO", "Contrato Campo", "CAMPO/CONTRATO", "Nombre del contrato", "No. Contrato"
      ],
      turno: [
        "TURNO", "Turno", "turno", "TURNO DE TRABAJO", "Turno de Trabajo", "Jornada", "JORNADA"
      ],
      conductor_nombre: [
        "NOMBRE DE QUIEN REALIZA LA INSPECCIÓN", "NOMBRE DE QUIEN REALIZA LA INSPECCIÓN ", "Nombre del Inspector", "Inspector", "INSPECTOR", "Conductor", "CONDUCTOR", "Nombre Conductor", "NOMBRE_CONDUCTOR"
      ],
      fecha: [
        "Marca temporal", "MARCA TEMPORAL", "Fecha", "FECHA", "fecha", "Timestamp", "Fecha de inspección"
      ],
      campo_coordinacion: [
        "CAMPO/COORDINACIÓN", "CAMPO/COORDINACION", "Campo/Coordinación", "Campo", "CAMPO", "Coordinación", "COORDINACION"
      ],
      kilometraje: [
        "KILOMETRAJE", "Kilometraje", "kilometraje", "KM", "Kilómetros"
      ]
    };
  }

  analyzeDates(data) {
    let year = null;
    const dates = [];
    const months = new Set();
    data.forEach(row => {
      Object.values(row).forEach(value => {
        if (value && (typeof value === 'string' || value instanceof Date)) {
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            dates.push(dateValue);
            months.add(dateValue.getMonth() + 1);
            if (!year) year = dateValue.getFullYear();
          }
        }
      });
    });
    const monthNames = Array.from(months).sort().map(m => {
      const monthNamesArr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return monthNamesArr[m - 1];
    });
    console.log(`[EXCEL] 📅 Fechas encontradas: ${dates.length}, Año: ${year}, Meses: [${monthNames.join(', ')}]`);
    return {
      año: year,
      meses: Array.from(months).sort(),
      mesesNombres: monthNames,
      totalFechas: dates.length,
      rangoFechas: dates.length > 0 ? {
        inicio: new Date(Math.min(...dates)).toISOString().split('T')[0],
        fin: new Date(Math.max(...dates)).toISOString().split('T')[0]
      } : null
    };
  }

  async mapRecords(rawData, columnMapping) {
    console.log(`[EXCEL] 🗂️ Mapeando ${rawData.length} registros...`);
    const mappedRecords = [];
    let errorsCount = 0;
    for (let i = 0; i < rawData.length; i++) {
      try {
        const rawRecord = rawData[i];
        const mapped = await this.mapSingleRecord(rawRecord, columnMapping.found, i + 1);
        if (mapped) {
          mappedRecords.push(mapped);
        }
      } catch (error) {
        errorsCount++;
        console.error(`[EXCEL] ❌ Error mapeando fila ${i + 1}:`, error.message);
        if (errorsCount > 100) {
          throw new Error(`Demasiados errores de mapeo (${errorsCount}). Verifique el formato del archivo.`);
        }
      }
    }
    console.log(`[EXCEL] ✅ Mapeo completado: ${mappedRecords.length} registros válidos, ${errorsCount} errores`);
    return mappedRecords;
  }

  async mapSingleRecord(rawRecord, foundColumns, rowNumber) {
    const generateId = () => crypto.randomBytes(8).toString('hex');
    const cleanString = (value) => {
      if (!value) return '';
      return String(value).trim().replace(/\s+/g, ' ');
    };
    const getValue = (dbField) => {
      const excelColumn = foundColumns[dbField];
      if (!excelColumn) return null;
      const value = rawRecord[excelColumn];
      return value !== undefined ? cleanString(value) : null;
    };
    const mapBool = (dbField) => {
      const val = getValue(dbField);
      const normalized = val ? val.toString().trim().toLowerCase() : '';
      let result = false;
      if (normalized.includes('no')) {
        result = false;
      } else if (normalized.includes('cumple')) {
        result = true;
      } else {
        result = false;
      }
      console.log(`[EXCEL] Campo booleano '${dbField}': valor original='${val}', normalizado='${normalized}', resultado=${result}`);
      return result;
    };
    return {
      id: generateId(),
      fecha: this.parseDate(getValue('fecha')),
      conductor_nombre: getValue('conductor_nombre') || '',
      placa_vehiculo: getValue('placa_vehiculo') || '',
      contrato: getValue('contrato') || '',
      turno: getValue('turno') || '',
      campo_coordinacion: getValue('campo_coordinacion') || '',
      kilometraje: parseInt(getValue('kilometraje') || '0') || 0,
      marca_temporal: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nivel_riesgo: 'BAJO',
      puntaje_total: 0,
      observaciones: '',
      gps: mapBool('gps'),
      pito: mapBool('pito'),
      freno: mapBool('freno'),
      frenos: mapBool('frenos'),
      correas: mapBool('correas'),
      espejos: mapBool('espejos'),
      parqueo: mapBool('parqueo'),
      puertas: mapBool('puertas'),
      vidrios: mapBool('vidrios'),
      baterias: mapBool('baterias'),
      tapiceria: mapBool('tapiceria'),
      cinturones: mapBool('cinturones'),
      orden_aseo: mapBool('orden_aseo'),
      suspension: mapBool('suspension'),
      altas_bajas: mapBool('altas_bajas'),
      horas_sueno: mapBool('horas_sueno'),
      indicadores: mapBool('indicadores'),
      tapa_tanque: mapBool('tapa_tanque'),
      aceite_motor: mapBool('aceite_motor'),
      libre_fatiga: mapBool('libre_fatiga'),
      direccionales: mapBool('direccionales'),
      documentacion: mapBool('documentacion'),
      fluido_frenos: mapBool('fluido_frenos'),
      kit_ambiental: mapBool('kit_ambiental'),
      limpia_brisas: mapBool('limpia_brisas'),
      espejos_estado: 'BUENO'
    };
  }

  parseDate(dateValue) {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.warn(`[EXCEL] ⚠️ Error parseando fecha: ${dateValue}`);
      return null;
    }
  }

  async processExcelFile(buffer, filename, options = {}) {
    console.log(`[EXCEL] 🚀 Procesando archivo: ${filename}`);
    try {
      // Leer el workbook
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Convertir a JSON para análisis
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      // Obtener headers
      const headers = Object.keys(jsonData[0] || {});
      // Generar hash del archivo
      const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
      // Análisis de fechas
      const dateInfo = this.analyzeDates(jsonData);
      // Mapear registros
      const columnMapping = { found: {} };
      for (const key in this.columnMapping) {
        columnMapping.found[key] = headers.find(h => this.columnMapping[key].some(name => name.toLowerCase() === h.toLowerCase()));
      }
      const mappedRecords = await this.mapRecords(jsonData, columnMapping);
      // Validar registros
      const validationResults = mappedRecords.map(record => this.validationService.validateRecord(record));
      let validRecords = 0;
      let errorRecords = 0;
      validationResults.forEach(v => v.isValid ? validRecords++ : errorRecords++);
      return {
        success: true,
        totalRecords: mappedRecords.length,
        validRecords,
        errorRecords,
        records: mappedRecords,
        validationResults,
        dateInfo,
        fileHash,
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('[EXCEL] ❌ Error procesando archivo:', error);
      throw error;
    }
  }
}

module.exports = ExcelService;