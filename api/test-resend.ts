import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Použijte POST.' });
  }

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const targetEmail = String(req.body?.targetEmail || '').trim();
  const fromEmail = String(req.body?.fromEmail || 'no-reply@luvia-decor.cz').trim();

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Na Vercelu chybí proměnná RESEND_API_KEY. Ověřená doména sama o sobě nestačí – aplikace potřebuje Resend API klíč.'
    });
  }

  if (!targetEmail) {
    return res.status(400).json({ success: false, message: 'Zadejte cílový e-mail.' });
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: `Luvia Decor <${fromEmail || 'no-reply@luvia-decor.cz'}>`,
      to: [targetEmail],
      subject: 'Test e-mailu – Luvia Decor',
      html: `<!doctype html><html lang="cs"><body style="margin:0;background:#f5f1ec;color:#2d2723;font-family:Arial,sans-serif"><div style="padding:32px 12px"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e8dfd5"><div style="padding:30px;text-align:center;background:#2d2723;color:#faf6f0;font-family:Georgia,serif;font-size:27px;letter-spacing:3px">LUVIA DECOR</div><div style="height:4px;background:#a48763"></div><div style="padding:30px"><h1 style="font-family:Georgia,serif">Testovací e-mail</h1><p>Pokud tento e-mail vidíte, odesílání přes Resend z aplikace Luvia Decor funguje správně.</p><p>S přáním hezkého dne,<br><strong>Tým Luvia Decor</strong></p></div></div></div></body></html>`
    });

    if (result.error) {
      console.error('Resend test error:', result.error);
      return res.status(502).json({ success: false, message: `Resend: ${result.error.message}` });
    }

    return res.status(200).json({ success: true, message: `Testovací e-mail byl přijat Resendem k odeslání. ID: ${result.data?.id || 'neuvedeno'}`, id: result.data?.id });
  } catch (error: any) {
    console.error('Resend test exception:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Resend se nepodařilo kontaktovat.' });
  }
}
