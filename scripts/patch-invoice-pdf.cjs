const fs = require('fs');
const path = require('path');
const file = path.resolve('src/components/InvoiceManager.tsx');
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('  const printInvoice = (invoice: Invoice = form) => {');
const end = source.indexOf('\n\n  return <div', start);
if (start === -1 || end === -1) throw new Error('InvoiceManager.tsx: printInvoice block not found');
const replacement = `  const buildInvoiceHtml = (invoice: Invoice = form) => {
    const st = styles.find(s => s.id === invoice.style) || styles[0];
    const rows = invoice.items.filter(i => i.name.trim()).map(i => \`<tr><td>\${esc(i.name)}</td><td>\${esc(i.qty)}</td><td>\${money(i.price)}</td><td>\${money(i.qty * i.price)}</td></tr>\`).join('');
    const contact = [invoice.sellerWeb && \`Web: \${esc(invoice.sellerWeb)}\`, invoice.sellerEmail && \`E-mail: \${esc(invoice.sellerEmail)}\`, invoice.sellerPhone && \`Telefon: \${esc(invoice.sellerPhone)}\`].filter(Boolean).join('<br>');
    return \`<!doctype html><html><head><meta charset="utf-8"><title>Faktura \${esc(invoice.number)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#27221e;margin:0;font-size:12px}.top{border-top:8px solid \${st.accent};padding-top:22px}.head{display:flex;justify-content:space-between;gap:30px}.brand{font-size:28px;font-weight:800;color:\${st.accent}}h1{font-size:25px;margin:0 0 8px}.muted{color:#777}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:32px 0}.box{border:1px solid #ddd;border-radius:8px;padding:15px}.label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:7px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:\${st.accent};color:#fff;text-align:left;padding:10px}td{padding:10px;border-bottom:1px solid #e5e5e5}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.totals{margin-left:auto;width:310px;margin-top:20px}.line{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:19px;font-weight:800;border-top:2px solid \${st.accent};padding-top:10px;margin-top:5px}.foot{margin-top:35px;border-top:1px solid #ddd;padding-top:14px;display:flex;justify-content:space-between}.note{margin-top:25px;padding:12px;background:#faf8f5;border-radius:6px;white-space:pre-wrap}</style></head><body><div class="top"><div class="head"><div><div class="brand">\${esc(invoice.sellerName)}</div><div class="muted">\${esc(invoice.sellerAddress)}<br>IČO: \${esc(invoice.sellerIco)} \${invoice.sellerDic ? ' · DIČ: '+esc(invoice.sellerDic) : ''}<br>\${contact}</div></div><div><h1>FAKTURA</h1><div>Číslo: <b>\${esc(invoice.number)}</b></div><div>Datum vystavení: \${esc(invoice.date)}</div><div>Datum splatnosti: \${esc(invoice.dueDate)}</div></div></div><div class="grid"><div class="box"><div class="label">Dodavatel</div><b>\${esc(invoice.sellerName)}</b><br>\${esc(invoice.sellerAddress)}<br>IČO: \${esc(invoice.sellerIco)}<br>\${invoice.sellerDic ? 'DIČ: '+esc(invoice.sellerDic)+'<br>' : ''}\${contact}</div><div class="box"><div class="label">Odběratel</div><b>\${esc(invoice.buyerName)}</b><br>\${esc(invoice.buyerAddress)}<br>IČO: \${esc(invoice.buyerIco)}<br>\${invoice.buyerDic ? 'DIČ: '+esc(invoice.buyerDic)+'<br>' : ''}\${esc(invoice.buyerEmail)}</div></div><table><thead><tr><th>Položka</th><th>Množství</th><th>Cena/ks</th><th>Celkem</th></tr></thead><tbody>\${rows}</tbody></table><div class="totals"><div class="line"><span>Mezisoučet</span><b>\${money(invoice.items.reduce((s, i) => s + i.qty * i.price, 0))}</b></div>\${invoice.shipping ? \`<div class="line"><span>Doprava</span><b>\${money(invoice.shipping)}</b></div>\` : ''}\${invoice.discount ? \`<div class="line"><span>Sleva</span><b>−\${money(invoice.discount)}</b></div>\` : ''}<div class="line grand"><span>CELKEM</span><span>\${money(Math.max(0, invoice.items.reduce((s, i) => s + i.qty * i.price, 0) + Number(invoice.shipping || 0) - Number(invoice.discount || 0)))}</span></div></div><div class="box" style="margin-top:30px"><div class="label">Platební údaje</div><b>\${esc(invoice.paymentMethod)}</b><br>Číslo účtu: \${esc(invoice.bankAccount)}<br>IBAN: \${esc(invoice.iban)}<br>SWIFT/BIC: \${esc(invoice.bic)}<br>Variabilní symbol: <b>\${esc(invoice.variableSymbol)}</b></div>\${invoice.note ? \`<div class="note">\${esc(invoice.note)}</div>\` : ''}<div class="foot"><span>Děkujeme za Vaši objednávku.</span><span>\${esc(invoice.number)}</span></div></div></body></html>\`;
  };

  const printInvoice = (invoice: Invoice = form) => {
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;
    w.document.write(buildInvoiceHtml(invoice).replace('</body>', '<script>window.onload=()=>window.print();<\\/script></body>'));
    w.document.close();
  };

  const downloadPdf = async (invoice: Invoice = form) => {
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.left = '-10000px'; iframe.style.top = '0';
    iframe.style.width = '794px'; iframe.style.height = '1123px'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    try {
      await new Promise<void>((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('PDF preview could not be rendered'));
        const doc = iframe.contentDocument;
        if (!doc) return reject(new Error('PDF document unavailable'));
        doc.open(); doc.write(buildInvoiceHtml(invoice)); doc.close();
      });
      const body = iframe.contentDocument?.body;
      if (!body) throw new Error('PDF document unavailable');
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(body, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, windowWidth: 794 });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = 210, pageHeight = 297;
      const imgWidth = pageWidth, imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight, position = 0;
      const image = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(image, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage(); pdf.addImage(image, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(\`Faktura-\${invoice.number || 'bez-cisla'}.pdf\`);
    } finally { iframe.remove(); }
  };`;
source = source.slice(0, start) + replacement + source.slice(end);
source = source.replace('onClick={()=>printInvoice()} className="rounded-xl border px-5 py-3 font-black flex items-center gap-2"><Download', 'onClick={()=>downloadPdf()} className="rounded-xl border px-5 py-3 font-black flex items-center gap-2"><Download');
source = source.replace('onClick={()=>printInvoice(inv)} className="text-xs font-bold"><Printer', 'onClick={()=>downloadPdf(inv)} className="text-xs font-bold"><Download');
fs.writeFileSync(file, source);
console.log('Patched invoice PDF download.');
