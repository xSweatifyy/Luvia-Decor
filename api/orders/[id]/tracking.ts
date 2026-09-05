import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');
type Carrier = 'PPL' | 'DPD' | 'Zásilkovna';

function trackingUrl(carrier: Carrier, number: string) {
  const n = encodeURIComponent(number.trim());
  if (carrier === 'Zásilkovna') return `https://tracking.packeta.com/cs/?id=${n}`;
  if (carrier === 'DPD') return `https://www.dpd.com/cz/cs/sledovani-zasilky/?parcelNumber=${n}`;
  return `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${n}`;
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*${tag}>`, 'i'));
  return match?.[1]?.replace(/<[^>]+>/g, '').trim() || '';
}

function normalizeText(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
}

function mapExternalToOrderStatus(result: any) {
  const text = normalizeText([result?.statusText, result?.codeText, result?.code].filter(Boolean).join(' '));
  if (!text) return null;
  if (/dorucena|vyzvednut|vydan|picked.?up|delivered/.test(text)) return 'dokonceno';
  if (/vracena|vracen|returned|return/.test(text)) return 'zruseno';
  if (/dorucovan|kuryr|out.?for.?delivery/.test(text)) return 'odeslano';
  if (/preprave|transit|depo|hub/.test(text)) return 'u_prepravce';
  if (/prevzat|accepted|pickup/.test(text)) return 'u_prepravce';
  if (/evidovan|registrovan|created|registered/.test(text)) return 'zpracovava_se';
  return null;
}

async function fetchPacketaStatus(packetId: string) {
  const apiPassword = process.env.PACKETA_API_PASSWORD || process.env.PACKETA_API_KEY;
  if (!apiPassword) return null;
  const body = `<packetStatus><apiPassword>${apiPassword.replace(/[<&>]/g, '')}</apiPassword><packetId>${packetId.replace(/[<&>]/g, '')}</packetId></packetStatus>`;
  const response = await fetch('https://www.zasilkovna.cz/api/rest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    body,
  });
  if (!response.ok) throw new Error(`Packeta API HTTP ${response.status}`);
  const xml = await response.text();
  const status = xmlValue(xml, 'status');
  if (status && status.toLowerCase() !== 'ok') throw new Error(xmlValue(xml, 'fault') || `Packeta API: ${status}`);
  return {
    code: xmlValue(xml, 'statusCode'),
    codeText: xmlValue(xml, 'codeText'),
    statusText: xmlValue(xml, 'statusText'),
    dateTime: xmlValue(xml, 'dateTime'),
    carrierName: xmlValue(xml, 'carrierName'),
  };
}

function normalizeCarrier(value: unknown): Carrier {
  const v = String(value || '').trim().toLowerCase();
  if (v.includes('zasil') || v.includes('packeta')) return 'Zásilkovna';
  if (v.includes('dpd')) return 'DPD';
  return 'PPL';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'PUT', 'POST', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Metoda není podporovaná.' });
  }

  try {
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Chybí ID objednávky.' });

    const rows = await sql`SELECT id, data FROM orders WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Objednávka nebyla nalezena.' });

    const order = { ...(rows[0].data || {}), id: rows[0].id } as any;
    const existing = order.tracking || {};

    if (req.method === 'GET') return res.status(200).json(existing || null);

    if (req.method === 'DELETE') {
      const updated = { ...order };
      delete updated.tracking;
      await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${id}`;
      return res.status(200).json(updated);
    }

    const autoRefresh = req.body?.autoRefresh === true;
    const carrier: Carrier = autoRefresh
      ? normalizeCarrier(existing.carrier)
      : normalizeCarrier(req.body?.carrier ?? existing.carrier ?? order.delivery?.carrier);

    const trackingNumber = autoRefresh
      ? String(existing.trackingNumber || '').trim()
      : String(req.body?.trackingNumber ?? existing.trackingNumber ?? '').trim();

    if (!trackingNumber) return res.status(400).json({ error: 'Zadejte číslo zásilky.' });

    let externalStatus = existing.externalStatus || null;
    let trackingHistory = Array.isArray(existing.history) ? existing.history : [];
    let refreshError: string | undefined;
    let mappedStatus: string | null = null;

    if (req.method === 'POST' || req.body?.refresh === true) {
      try {
        if (carrier === 'Zásilkovna') {
          const result = await fetchPacketaStatus(trackingNumber);
          if (result) {
            externalStatus = result;
            mappedStatus = mapExternalToOrderStatus(result);
            trackingHistory = result.statusText
              ? [{ ...result, fetchedAt: new Date().toISOString() }, ...trackingHistory].slice(0, 30)
              : trackingHistory;
          }
        }
      } catch (error: any) {
        refreshError = error?.message || 'Aktualizace sledování selhala.';
      }
    }

    const manualStatus = req.body?.status;
    const tracking = {
      carrier,
      trackingNumber,
      trackingUrl: trackingUrl(carrier, trackingNumber),
      status: String(manualStatus ?? existing.status ?? 'Zásilka evidována'),
      externalStatus,
      history: trackingHistory,
      updatedAt: new Date().toISOString(),
      refreshError,
    };

    const updated = { ...order, tracking };
    if (mappedStatus && autoRefresh !== true) updated.status = mappedStatus;

    await sql`UPDATE orders SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${id}`;
    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Order tracking API error:', error);
    return res.status(500).json({ error: error?.message || 'Chyba serveru.' });
  }
}
