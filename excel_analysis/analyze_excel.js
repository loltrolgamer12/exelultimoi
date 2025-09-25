// Script para analizar archivo Excel y extraer datos organizados

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, 'HQ-FO-40 INSPECCIÓN DIARIA DE VEHÍCULO LIVIANO. (respuestas) (8).xlsx');
const outputPath = path.join(__dirname, 'excel_data.txt');

function analyzeExcel(filePath, outputTxt) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('No se encontró ninguna hoja en el archivo Excel.');
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', blankrows: false });
    if (!jsonData || jsonData.length === 0) throw new Error('No se encontraron filas de datos en la hoja.');

    // Extraer encabezados
    const headers = Object.keys(jsonData[0] || {});
    if (headers.length === 0) throw new Error('No se encontraron encabezados en la hoja.');

    // Organizar datos
    let output = 'ENCABEZADOS:\n';
    output += headers.join(' | ') + '\n\n';
    output += 'FILAS DE DATOS:\n';
    jsonData.forEach((row, idx) => {
      output += `Fila ${idx + 1}: `;
      output += headers.map(h => `${h}: ${row[h]}`).join(' | ');
      output += '\n';
    });

    fs.writeFileSync(outputTxt, output, 'utf8');
    console.log('Datos extraídos y guardados en', outputTxt);
  } catch (error) {
    console.error('Error analizando el archivo Excel:', error.message);
    fs.writeFileSync(outputTxt, 'ERROR: ' + error.message, 'utf8');
  }
}

analyzeExcel(excelPath, outputPath);
