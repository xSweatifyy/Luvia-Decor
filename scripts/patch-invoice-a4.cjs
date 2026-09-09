const fs = require('fs');
const path = require('path');
const file = path.resolve('src/components/InvoiceManager.tsx');
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  ['@page{size:A4;margin:14mm}', '@page{size:A4;margin:0}'],
  ['body{font-family:Arial,sans-serif;color:#27221e;margin:0;font-size:12px}', 'body{font-family:Arial,sans-serif;color:#27221e;margin:0;width:210mm;height:297mm;padding:12mm;overflow:hidden;font-size:10.5px;line-height:1.25}'],
  ['.top{border-top:8px solid ${st.accent};padding-top:22px}', '.top{border-top:5px solid ${st.accent};padding-top:12px;height:100%}'],
  ['.brand{font-size:28px', '.brand{font-size:24px'],
  ['h1{font-size:25px;margin:0 0 8px}', 'h1{font-size:22px;margin:0 0 5px}'],
  ['.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:32px 0}', '.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:17px 0}'],
  ['.box{border:1px solid #ddd;border-radius:8px;padding:15px}', '.box{border:1px solid #ddd;border-radius:6px;padding:9px}'],
  ['.label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:7px;font-weight:700}', '.label{font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:#777;margin-bottom:4px;font-weight:700}'],
  ['table{width:100%;border-collapse:collapse;margin-top:20px}', 'table{width:100%;border-collapse:collapse;margin-top:12px}'],
  ['th{background:${st.accent};color:#fff;text-align:left;padding:10px}', 'th{background:${st.accent};color:#fff;text-align:left;padding:7px}'],
  ['td{padding:10px;border-bottom:1px solid #e5e5e5}', 'td{padding:6px 7px;border-bottom:1px solid #e5e5e5}'],
  ['.totals{margin-left:auto;width:310px;margin-top:20px}', '.totals{margin-left:auto;width:270px;margin-top:10px}'],
  ['.line{display:flex;justify-content:space-between;padding:6px 0}', '.line{display:flex;justify-content:space-between;padding:3px 0}'],
  ['.grand{font-size:19px;font-weight:800;border-top:2px solid ${st.accent};padding-top:10px;margin-top:5px}', '.grand{font-size:16px;font-weight:800;border-top:2px solid ${st.accent};padding-top:6px;margin-top:3px}'],
  ['.foot{margin-top:35px;border-top:1px solid #ddd;padding-top:14px;display:flex;justify-content:space-between}', '.foot{margin-top:15px;border-top:1px solid #ddd;padding-top:8px;display:flex;justify-content:space-between}'],
  ['.note{margin-top:25px;padding:12px;background:#faf8f5;border-radius:6px;white-space:pre-wrap}', '.note{margin-top:12px;padding:8px;background:#faf8f5;border-radius:5px;white-space:pre-wrap}'],
  ['style="margin-top:30px"', 'style="margin-top:14px"'],
];

for (const [from, to] of replacements) {
  source = source.replace(from, to);
}

// Keep the generated PDF canvas exactly at the CSS A4 pixel dimensions.
source = source.replace("iframe.style.width = '794px'; iframe.style.height = '1123px';", "iframe.style.width = '794px'; iframe.style.height = '1123px';");
source = source.replace("width: 794, windowWidth: 794", "width: 794, height: 1123, windowWidth: 794, windowHeight: 1123");

fs.writeFileSync(file, source);
console.log('Patched invoice PDF to compact single-page A4 layout.');
