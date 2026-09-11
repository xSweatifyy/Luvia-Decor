import { jsPDF } from 'jspdf';

export type GiftCardPdfOptions = {
  amount: number;
  cardCode?: string;
  securityCode?: string;
  slogan?: string;
  logoText?: string;
  design?: string;
};

const designs: Record<string, { bg: string; accent: string }> = {
  obsidian: { bg: '#101010', accent: '#D8B56A' },
  champagne: { bg: '#EEE3D3', accent: '#89683D' },
  ivory: { bg: '#FAF7F0', accent: '#786653' },
  emerald: { bg: '#18372D', accent: '#D9D3A1' },
  velvet: { bg: '#3B151D', accent: '#E7C98D' },
  rose: { bg: '#704C57', accent: '#F3D9DE' },
  midnight: { bg: '#121827', accent: '#CDB37A' },
  mocha: { bg: '#29201B', accent: '#D1AE84' },
  sage: { bg: '#58695B', accent: '#E4DEC1' },
  navy: { bg: '#17273C', accent: '#DEC586' },
  blackwhite: { bg: '#171717', accent: '#F1E9DA' },
  lavender: { bg: '#696078', accent: '#EFE3F1' },
};

const hexRgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] as const;
};

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
};

const drawCentered = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baselineY: number,
  font: string,
  color: string,
  maxWidth?: number,
  lineHeight?: number,
) => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (!maxWidth) { ctx.fillText(text, x, baselineY); return; }
  const lines = wrapText(ctx, text, maxWidth);
  const lh = lineHeight || parseInt(font.match(/(\d+(?:\.\d+)?)px/)?.[1] || '16', 10) * 1.25;
  lines.forEach((line, index) => ctx.fillText(line, x, baselineY + index * lh));
};

export const createGiftCardPdf = async (options: GiftCardPdfOptions) => {
  if (typeof document === 'undefined') throw new Error('PDF lze vytvořit pouze v prohlížeči.');
  if (document.fonts?.ready) await document.fonts.ready;

  const selected = designs[options.design || 'obsidian'] || designs.obsidian;
  const scale = 8;
  const width = 210 * scale;
  const height = 148 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Nepodařilo se připravit náhled dárkové karty.');

  const bg = hexRgb(selected.bg);
  const accent = hexRgb(selected.accent);
  ctx.fillStyle = selected.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = selected.accent;
  ctx.lineWidth = 0.7 * scale;
  ctx.beginPath();
  ctx.roundRect(7 * scale, 7 * scale, 196 * scale, 134 * scale, 5 * scale);
  ctx.stroke();
  ctx.lineWidth = 0.25 * scale;
  ctx.beginPath();
  ctx.roundRect(10 * scale, 10 * scale, 190 * scale, 128 * scale, 4 * scale);
  ctx.stroke();

  const light = options.design === 'champagne' || options.design === 'ivory';
  const main = light ? '#2D2723' : '#FAF6F0';
  const accentCss = `rgb(${accent[0]},${accent[1]},${accent[2]})`;
  const muted = light ? '#50463E' : '#E1D8CD';
  const family = 'Arial, "Noto Sans", "Segoe UI", sans-serif';
  const centerX = 105 * scale;

  drawCentered(ctx, String(options.logoText || 'LUVIA DECOR').toUpperCase(), centerX, 28 * scale, `700 ${21 * 1.333}px ${family}`, main);
  drawCentered(ctx, 'KVĚTINOVÝ ATELIÉR · DEKORACE · KROMĚŘÍŽ', centerX, 37 * scale, `700 ${7 * 1.333}px ${family}`, accentCss);
  drawCentered(ctx, 'DARUJTE RADOST · VYBERTE SI KRÁSNĚ', centerX, 52 * scale, `700 ${8 * 1.333}px ${family}`, accentCss);
  drawCentered(ctx, 'DÁRKOVÁ KARTA', centerX, 69 * scale, `700 ${24 * 1.333}px ${family}`, main);
  drawCentered(ctx, 'S LÁSKOU PRO VÁS', centerX, 79 * scale, `700 ${8 * 1.333}px ${family}`, accentCss);
  drawCentered(ctx, `${money(options.amount)} Kč`, centerX, 96 * scale, `700 ${27 * 1.333}px ${family}`, main);
  drawCentered(ctx, options.slogan || 'Ručně tvořené dekorace a květinový ateliér v Kroměříži', centerX, 108 * scale, `600 ${9 * 1.333}px ${family}`, muted, 165 * scale, 13 * scale);
  drawCentered(ctx, 'Digitální dárková karta · doručení e-mailem · kód a bezpečnostní kód obdržíte po zpracování objednávky.', centerX, 123 * scale, `600 ${7.5 * 1.333}px ${family}`, muted, 175 * scale, 11 * scale);
  drawCentered(ctx, 'Dárkovou kartu lze čerpat postupně při více nákupech až do vyčerpání její hodnoty.', centerX, 132 * scale, `600 ${7 * 1.333}px ${family}`, accentCss, 175 * scale, 11 * scale);
  if (options.cardCode) {
    drawCentered(ctx, `Číslo karty: ${options.cardCode}   ·   Bezpečnostní kód: ${options.securityCode || ''}`, centerX, 140 * scale, `600 ${7 * 1.333}px ${family}`, accentCss, 185 * scale, 10 * scale);
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 148, undefined, 'FAST');
  const suffix = options.cardCode || `${options.amount}Kc`;
  pdf.save(`Luvia-Decor-Darkova-karta-${suffix}.pdf`);
};
