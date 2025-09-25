import XLSX from 'xlsx';

const filePath = 'C:/Users/juan/Desktop/exelfinal/HQ-FO-40 INSPECCIÓN DIARIA DE VEHÍCULO LIVIANO. (respuestas) (8).xlsx';

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const headers = jsonData[0];
console.log('Encabezados encontrados:', headers);