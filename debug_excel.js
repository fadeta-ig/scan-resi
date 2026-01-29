const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:/Users/IT WIG/Desktop/scan-resi/Semua pesanan-2026-01-22-16_21.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
const headers = data[0];

const results = [];
headers.forEach((h, i) => {
    if (h) {
        results.push(`${i}: ${h}`);
    }
});

require('fs').writeFileSync('excel_headers.txt', results.join('\n'));
console.log('Wrote headers to excel_headers.txt');
console.log('Sample Data Row 1:', JSON.stringify(data[1], null, 2));
