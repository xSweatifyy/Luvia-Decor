import type { VercelRequest, VercelResponse } from '@vercel/node';

const ZASLAT_API = 'https://www.zaslat.cz/api/v1';
const DEFAULT_PACKAGE = { weight: 5, width: 20, height: 20, length: 20 };
const FUEL_SURCHARGE = 0.105;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda není podporovaná.' });

  const apiKey = process.env.ZASLAT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Chybí ZASLAT_API_KEY ve Vercelu.' });

  try {
    const body = req.body || {};
    const fromCountry = String(body.fromCountry || 'CZ').toUpperCase();
    const toCountry = String(body.toCountry || 'CZ').toUpperCase();
    const packages = Array.isArray(body.packages) && body.packages.length ? body.packages : [DEFAULT_PACKAGE];

    const apiResponse = await fetch(`${ZASLAT_API}/rates/get`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Apikey': apiKey },
      body: JSON.stringify({
        currency: 'CZK',
        pickup_date: new Date().toISOString().slice(0, 10),
        from: { country: fromCountry },
        to: { country: toCountry },
        packages,
      }),
    });

    const data: any = await apiResponse.json().catch(() => null);
    if (!apiResponse.ok || Number(data?.status || apiResponse.status) >= 400) {
      return res.status(apiResponse.status || 502).json({
        error: data?.message || 'Zaslat API nevrátilo nabídku dopravy.',
        details: data?.errors || undefined,
      });
    }

    const rates = Array.isArray(data?.rates) ? data.rates : [];
    const normalized = rates.map((rate: any) => {
      const baseExVat = Number(rate?.price?.value || 0);
      const baseVat = Number(rate?.price_vat?.value || 0);
      const fuelExVat = baseExVat * FUEL_SURCHARGE;
      const totalExVat = baseExVat + fuelExVat;
      const vatRate = baseExVat > 0 && baseVat > baseExVat ? (baseVat / baseExVat) - 1 : 0.21;
      const vat = totalExVat * vatRate;
      const totalVat = totalExVat + vat;
      return {
        ...rate,
        price_base: { value: baseExVat, currency: 'CZK' },
        fuel_surcharge: { value: fuelExVat, currency: 'CZK', rate: 10.5 },
        price_total_ex_vat: { value: totalExVat, currency: 'CZK' },
        vat: { value: vat, currency: 'CZK', rate: vatRate * 100 },
        price_final: { value: totalVat, currency: 'CZK' },
        price: { value: totalVat, currency: 'CZK' },
        price_vat: { value: totalVat, currency: 'CZK' },
      };
    });

    return res.status(200).json({
      rates: normalized,
      fuelSurchargeRate: 10.5,
      message: data?.message,
      package: DEFAULT_PACKAGE,
    });
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || 'Spojení se Zaslat API se nepodařilo navázat.' });
  }
}
