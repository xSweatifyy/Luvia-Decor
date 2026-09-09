import { Resend } from 'resend';
import { Order, SiteConfig } from '../src/types';

export interface SendOrderEmailResult { success: boolean; messageId?: string; error?: string; }
export interface SendOrderStatusEmailResult { success: boolean; messageId?: string; error?: string; }

const STATUS_LABELS: Record<Order['status'], string> = {
  nova: 'Nová',
  zpracovava_se: 'Zpracovává se',
  zaplaceno: 'Zaplaceno',
  u_prepravce: 'U přepravce',
  odeslano: 'Odesláno',
  dokonceno: 'Dokončeno',
  zruseno: 'Zrušeno'
};

const STATUS_MESSAGES: Record<Order['status'], { title: string; text: string }> = {
  nova: { title: 'Vaše objednávka byla přijata', text: 'Vaše objednávka byla přijata a čeká na další zpracování.' },
  zpracovava_se: { title: 'Vaše objednávka se zpracovává', text: 'Na Vaší objednávce právě pracujeme.' },
  zaplaceno: { title: 'Platba byla zaznamenána', text: 'Vaše platba byla zaznamenána a objednávka pokračuje ve zpracování.' },
  u_prepravce: { title: 'Objednávka byla předána přepravci', text: 'Vaše zásilka byla předána přepravci.' },
  odeslano: { title: 'Objednávka byla odeslána', text: 'Vaše objednávka byla odeslána a je na cestě k Vám.' },
  dokonceno: { title: 'Objednávka byla dokončena', text: 'Vaše objednávka byla úspěšně dokončena. Děkujeme za Váš nákup.' },
  zruseno: { title: 'Objednávka byla zrušena', text: 'Vaše objednávka byla zrušena. Pokud potřebujete více informací, kontaktujte nás.' }
};

const formatMoney = (value: any) => Number(value ?? 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (value: any) => String(value ?? '').replace(/[&<>\"']/g, (c: any) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c] || c));
const resolveProductImage = (imageUrl?: string) => {
  const value = String(imageUrl || '').trim();
  if (!value) return 'https://www.luvia-decor.cz/Luvia-Decor.jpeg';
  return /^https?:\/\//i.test(value) ? value : `https://www.luvia-decor.cz/${value.replace(/^\/+/, '')}`;
};

function buildOrderSummaryHtml(order: Order): string {
  const carrierName = String(order.delivery?.carrier || '').trim() || (order.delivery?.method === 'personal_pickup' ? 'Osobní odběr – Kroměříž' : 'Doprava');
  const shippingAmount = Number(order.shipping ?? 0);
  const items = order.items.map(item => `<tr style="border-bottom:1px solid #EFEAE3;"><td style="padding:12px 8px;font-size:14px;color:#2D2723;"><img src="${resolveProductImage(item.imageUrl)}" alt="${esc(item.title)}" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:6px;margin-bottom:6px;" /><strong>${esc(item.title)}</strong></td><td style="padding:12px 8px;font-size:14px;text-align:center;color:#2D2723;">${Number(item.quantity || 1)}×</td><td style="padding:12px 8px;font-size:14px;text-align:right;color:#2D2723;font-weight:600;white-space:nowrap;">${formatMoney(Number(item.price || 0) * Number(item.quantity || 1))} Kč</td></tr>`).join('');
  const discountRow = Number(order.discount || 0) > 0 ? `<tr><td colspan="2" style="padding:8px;text-align:right;color:#6E5F52;">Sleva</td><td style="padding:8px;text-align:right;color:#6E5F52;">−${formatMoney(order.discount)} Kč</td></tr>` : '';
  const pickupAddress = String((order.delivery as any)?.pickupPointAddress || (order.delivery as any)?.pickupAddress || '').trim();
  const deliveryText = pickupAddress ? `${carrierName} · ${pickupAddress}` : carrierName;
  return `<div style="background:#FAF8F5;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:#5C5046;"><strong>Doručení:</strong> ${esc(deliveryText)}<br><strong>Cena dopravy:</strong> ${formatMoney(shippingAmount)} Kč</div><h3 style="font-size:16px;font-family:Georgia,serif;margin:24px 0 12px;border-bottom:2px solid #F0EAE1;padding-bottom:8px;color:#2D2723;">Produkty</h3><table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><thead><tr style="background:#F8F5F0;text-align:left;font-size:12px;text-transform:uppercase;color:#8A7B6E;"><th style="padding:8px;">Produkt</th><th style="padding:8px;text-align:center;">Množství</th><th style="padding:8px;text-align:right;">Cena</th></tr></thead><tbody>${items}<tr style="border-bottom:1px solid #EFEAE3;"><td colspan="2" style="padding:12px 8px;font-size:14px;color:#2D2723;"><strong>Doprava (${esc(carrierName)})</strong></td><td style="padding:12px 8px;font-size:14px;text-align:right;color:#2D2723;font-weight:600;white-space:nowrap;">${formatMoney(shippingAmount)} Kč</td></tr></tbody><tfoot>${discountRow}<tr><td colspan="2" style="padding:16px 8px 8px;font-weight:700;font-size:16px;text-align:right;color:#2D2723;">Celková cena k úhradě:</td><td style="padding:16px 8px 8px;font-weight:700;font-size:18px;text-align:right;color:#8C7355;white-space:nowrap;">${formatMoney(order.totalPrice)} Kč</td></tr></tfoot></table>`;
}

function buildPaymentHtml(config: SiteConfig): string {
  return `<div style="background:#FAF8F5;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:#5C5046;"><strong>Číslo účtu (ČR):</strong> 963625003/5500<br><strong>IBAN (zahraniční platby):</strong> CZ96 5500 0000 0009 6362 5003<br><strong>SWIFT/BIC:</strong> RZBCCZPP</div>`;
}

function buildBaseEmail(order: Order, config: SiteConfig, heading: string, intro: string): string {
  const summary = buildOrderSummaryHtml(order);
  const payment = buildPaymentHtml(config);
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>${esc(heading)} - Luvia Decor</title></head><body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#FAF8F5;margin:0;padding:24px;color:#2D2723;"><div style="max-width:600px;margin:0 auto;background:#FFF;border-radius:12px;border:1px solid #EAE3DB;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.04);"><div style="background:#2D2723;color:#F5EFE6;padding:28px 24px;text-align:center;"><h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;letter-spacing:2px;text-transform:uppercase;">LUVIA DECOR</h1><p style="margin:0;font-size:13px;color:#D1C7BC;">Ručně tvořené dekorace & květinový ateliér Kroměříž</p></div><div style="padding:30px 24px;"><div style="background:#F6F3EE;border-left:4px solid #8C7355;padding:16px;border-radius:6px;margin-bottom:24px;"><p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#433526;">${esc(heading)}</p><p style="margin:0;font-size:14px;color:#6E5F52;">${esc(intro)}</p></div><p style="font-size:15px;line-height:1.6;color:#40362F;">Vážený zákazníku / Vážená zákaznice <strong>${esc(order.customer.fullName)}</strong>,</p><div style="background:#FAF8F5;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:#5C5046;"><strong>Číslo objednávky:</strong> ${esc(order.orderNumber)}<br><strong>Datum vytvoření:</strong> ${new Date(order.createdAt).toLocaleString('cs-CZ')}<br><strong>Způsob platby:</strong> Bankovní převod</div>${payment}${summary}<h3 style="font-size:16px;font-family:Georgia,serif;margin:24px 0 12px;border-bottom:2px solid #F0EAE1;padding-bottom:8px;color:#2D2723;">Kontaktní a doručovací údaje</h3><div style="font-size:14px;line-height:1.6;color:#4F433A;background:#FAF8F5;padding:14px 18px;border-radius:8px;"><strong>Jméno a příjmení:</strong> ${esc(order.customer.fullName)}<br><strong>E-mail:</strong> ${esc(order.customer.email)}<br><strong>Telefon:</strong> ${esc(order.customer.phone)}<br><strong>Doručovací adresa:</strong> ${esc(order.customer.street)}, ${esc(order.customer.zip)} ${esc(order.customer.city)}<br>${order.customer.note ? `<strong>Poznámka k objednávce:</strong> ${esc(order.customer.note)}` : ''}</div><div style="margin-top:30px;padding-top:20px;border-top:1px solid #EAE3DB;font-size:13px;color:#7B6E63;line-height:1.6;">V případě jakýchkoliv dotazů se na nás můžete kdykoliv obrátit:<br>E-mail na podporu: <a href="mailto:${esc(config.supportEmail)}">${esc(config.supportEmail)}</a><br>E-mail na objednávky: <a href="mailto:${esc(config.ordersEmail)}">${esc(config.ordersEmail)}</a><br>Telefon: <a href="tel:${esc(config.phone)}">${esc(config.phoneDisplay)}</a></div></div><div style="background:#F5EFE6;padding:20px;text-align:center;font-size:12px;color:#8A7B6E;border-top:1px solid #E6DCD1;"><p style="margin:0 0 4px;"><strong>Luvia Decor</strong> | Odpovědná osoba: ${esc(config.responsiblePerson)}</p><p style="margin:0 0 4px;">Sídlo: ${esc(config.registeredOffice)} | IČO: ${esc(config.ico)}</p><p style="margin:0;">© ${new Date().getFullYear()} Luvia Decor. Všechna práva vyhrazena.</p></div></div></body></html>`;
}

export async function sendOrderEmails(order: Order, config: SiteConfig): Promise<SendOrderEmailResult> {
  const apiKey = config.resend?.apiKey?.trim() || process.env.RESEND_API_KEY;
  const fromEmail = config.resend?.senderEmail?.trim() || 'onboarding@resend.dev';
  const notifyEmail = config.resend?.notifyEmail?.trim() || 'objednavky@luvia-decor.cz';
  if (!apiKey) return { success: false, error: 'Chybí Resend API klíč.' };
  try {
    const resend = new Resend(apiKey);
    const html = buildBaseEmail(order, config, 'Objednávka byla úspěšně přijata.', 'Již brzy Vás budeme kontaktovat ohledně dokončení a předání či odeslání.');
    const customerResponse = await resend.emails.send({ from: `Luvia Decor <${fromEmail}>`, to: [order.customer.email], subject: `Potvrzení objednávky ${order.orderNumber} - Luvia Decor`, html });
    if (notifyEmail && notifyEmail !== order.customer.email) {
      try { await resend.emails.send({ from: `Luvia Decor Systém <${fromEmail}>`, to: [notifyEmail], subject: `NOVÁ OBJEDNÁVKA: ${order.orderNumber} (${order.customer.fullName} - ${formatMoney(order.totalPrice)} Kč)`, html }); } catch (shopErr) { console.warn('[Resend] Notice skipped or rejected:', shopErr); }
    }
    return { success: true, messageId: customerResponse.data?.id };
  } catch (error: any) {
    console.error('[Resend] Error sending order email:', error);
    return { success: false, error: error?.message || 'Odeslání e-mailu přes Resend selhalo.' };
  }
}

export async function sendOrderStatusEmail(order: Order, config: SiteConfig): Promise<SendOrderStatusEmailResult> {
  const apiKey = config.resend?.apiKey?.trim() || process.env.RESEND_API_KEY;
  const fromEmail = config.resend?.senderEmail?.trim() || 'onboarding@resend.dev';
  if (!apiKey) return { success: false, error: 'Chybí Resend API klíč.' };
  const status = order.status || 'nova';
  const meta = STATUS_MESSAGES[status];
  try {
    const resend = new Resend(apiKey);
    const html = buildBaseEmail(order, config, meta.title, meta.text);
    const response = await resend.emails.send({ from: `Luvia Decor <${fromEmail}>`, to: [order.customer.email], subject: `${meta.title} – ${order.orderNumber} | Luvia Decor`, html });
    if (response.error) return { success: false, error: response.error.message };
    return { success: true, messageId: response.data?.id };
  } catch (error: any) {
    console.error('[Resend] Error sending order status email:', error);
    return { success: false, error: error?.message || 'Odeslání stavového e-mailu přes Resend selhalo.' };
  }
}

export async function sendTestEmail(apiKey: string, targetEmail: string, fromEmail = 'onboarding@resend.dev'): Promise<{success:boolean;message:string}> {
  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({ from: `Luvia Decor Test <${fromEmail}>`, to: [targetEmail], subject: `Test Resend integrace - Luvia Decor (${new Date().toLocaleTimeString('cs-CZ')})`, html: `<div style="font-family:sans-serif;padding:20px;background:#FAF8F5;color:#2D2723;"><h2 style="color:#8C7355;">🌿 Resend API integrace funguje správně!</h2><p>Tento testovací e-mail potvrzuje, že Váš Resend API klíč je platný a připravený k odesílání objednávek zákazníkům Luvia Decor.</p><p style="font-size:12px;color:#7B6E63;">Odesláno z administrace ateliéru Luvia Decor v Kroměříži.</p></div>` });
    if (response.error) return { success:false, message:response.error.message };
    return { success:true, message:`E-mail byl úspěšně odeslán na ${targetEmail} (ID: ${response.data?.id})` };
  } catch (err:any) { return { success:false, message:err?.message || 'Chyba při komunikaci s Resend API.' }; }
}
