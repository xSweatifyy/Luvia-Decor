import { jsPDF } from 'jspdf';

export type GiftCardPdfOptions = {
  amount: number;
  cardCode?: string;
  securityCode?: string;
  slogan?: string;
  logoText?: string;
  design?: string;
};

type Theme = { bg: string; bg2: string; accent: string; accent2: string; text: string; muted: string; label: string; style: string };

const themes: Record<string, Theme> = {
  obsidian: { bg: '#0D0D0C', bg2: '#211D17', accent: '#D9B66F', accent2: '#F3DFB1', text: '#FBF7EF', muted: '#C9BFAF', label: '#E0C78F', style: 'gold' },
  champagne: { bg: '#E9DCCB', bg2: '#FFF9F0', accent: '#89683D', accent2: '#C9A86A', text: '#2D2723', muted: '#675A4F', label: '#765A36', style: 'champagne' },
  ivory: { bg: '#F8F3E9', bg2: '#FFFDF8', accent: '#796650', accent2: '#B99B69', text: '#29241F', muted: '#71665C', label: '#806A4D', style: 'ivory' },
  emerald: { bg: '#102D25', bg2: '#1C4639', accent: '#D9D0A0', accent2: '#F0E8C2', text: '#F8F5E9', muted: '#C9C8B5', label: '#E4D9A7', style: 'botanical' },
  velvet: { bg: '#351017', bg2: '#571E2A', accent: '#E7C98D', accent2: '#F7E5B9', text: '#FFF8F0', muted: '#D7C5BD', label: '#E9CF99', style: 'velvet' },
  rose: { bg: '#694551', bg2: '#8A5C6A', accent: '#F1D4D9', accent2: '#FFECEF', text: '#FFF9F8', muted: '#E8D3D6', label: '#F2D9DE', style: 'rose' },
  midnight: { bg: '#0D1422', bg2: '#1A2941', accent: '#CDB37A', accent2: '#F0DDA8', text: '#F7F3E9', muted: '#C4C7CE', label: '#D8BE83', style: 'night' },
  mocha: { bg: '#241A15', bg2: '#3B2920', accent: '#D0A77D', accent2: '#E8CCAA', text: '#FBF5EC', muted: '#CDBEAF', label: '#DAB389', style: 'mocha' },
  sage: { bg: '#4C5E51', bg2: '#68796A', accent: '#E4DDBF', accent2: '#F5EFD5', text: '#FCF9EE', muted: '#D8D9C9', label: '#E8E1C3', style: 'botanical' },
  navy: { bg: '#101E31', bg2: '#213A59', accent: '#DEC586', accent2: '#F1DCA7', text: '#F8F5ED', muted: '#C5CBD3', label: '#E3C98A', style: 'night' },
  blackwhite: { bg: '#111111', bg2: '#252525', accent: '#EFE7D8', accent2: '#FFFFFF', text: '#FFFFFF', muted: '#D1D1D1', label: '#F0E9DC', style: 'mono' },
  lavender: { bg: '#5D526C', bg2: '#7B6D88', accent: '#E9DDF0', accent2: '#FFF4FF', text: '#FFF9FF', muted: '#DED4E2', label: '#EDDFEF', style: 'lavender' },
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

const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, maxWidth?: number, lineHeight = 1.25) => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lines = maxWidth ? wrapText(ctx, value, maxWidth) : [value];
  const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] || 16);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * size * lineHeight));
};

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, line = 1) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
};

const ornament = (ctx: CanvasRenderingContext2D, x: number, y: number, flip = false, color: string) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.strokeStyle = color;
  ctx.globalAlpha = .7;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.bezierCurveTo(14, -4, 18, -15, 30, -18); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(11, -5, 5, 2.2, -.55, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(19, -11, 5, 2.2, -.7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
};

const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme) => {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, theme.bg);
  gradient.addColorStop(.55, theme.bg2);
  gradient.addColorStop(1, theme.bg);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * .5, h * .42, 20, w * .5, h * .42, w * .58);
  glow.addColorStop(0, `${theme.accent}20`);
  glow.addColorStop(1, `${theme.accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = .055;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

export const createGiftCardPdf = async (options: GiftCardPdfOptions) => {
  if (typeof document === 'undefined') throw new Error('PDF lze vytvořit pouze v prohlížeči.');
  if (document.fonts?.ready) await document.fonts.ready;

  const theme = themes[options.design || 'obsidian'] || themes.obsidian;
  const scale = 8;
  const width = 210 * scale;
  const height = 148 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Nepodařilo se připravit náhled dárkové karty.');

  const accent = theme.accent;
  const main = theme.text;
  const muted = theme.muted;
  const centerX = 105 * scale;
  drawBackground(ctx, width, height, theme);

  // Premium double frame + corner ornaments.
  ctx.strokeStyle = accent;
  ctx.globalAlpha = .95;
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath(); ctx.roundRect(5.5 * scale, 5.5 * scale, 199 * scale, 137 * scale, 7 * scale); ctx.stroke();
  ctx.globalAlpha = .55;
  ctx.lineWidth = .35 * scale;
  ctx.beginPath(); ctx.roundRect(9 * scale, 9 * scale, 192 * scale, 130 * scale, 5 * scale); ctx.stroke();
  ctx.globalAlpha = 1;
  ornament(ctx, 15 * scale, 23 * scale, false, accent);
  ornament(ctx, 195 * scale, 23 * scale, true, accent);
  ornament(ctx, 15 * scale, 127 * scale, false, accent);
  ornament(ctx, 195 * scale, 127 * scale, true, accent);

  // Header.
  text(ctx, String(options.logoText || 'LUVIA DECOR').toUpperCase(), centerX, 25 * scale, `700 ${20 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, main);
  text(ctx, 'KVĚTINOVÝ ATELIÉR  ·  DEKORACE  ·  KROMĚŘÍŽ', centerX, 34 * scale, `700 ${6.5 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent);
  ctx.fillStyle = accent;
  ctx.globalAlpha = .7;
  ctx.fillRect(88 * scale, 40 * scale, 34 * scale, .35 * scale);
  ctx.globalAlpha = 1;

  text(ctx, 'DARUJTE RADOST', centerX, 49 * scale, `700 ${7.5 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent);
  text(ctx, 'DÁRKOVÁ KARTA', centerX, 66 * scale, `700 ${22 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, main);
  text(ctx, 'S LÁSKOU PRO VÁS', centerX, 75 * scale, `700 ${7.5 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent);

  // Luxury amount plaque.
  rounded(ctx, 67 * scale, 82 * scale, 76 * scale, 19 * scale, 3.5 * scale, `${theme.accent}16`, `${accent}AA`, .45 * scale);
  text(ctx, 'HODNOTA', centerX, 88 * scale, `700 ${5.5 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent);
  text(ctx, `${money(options.amount)} Kč`, centerX, 97 * scale, `700 ${22 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, main);

  // Brand promise / slogan.
  text(ctx, options.slogan || 'Ručně tvořené dekorace a květinový ateliér v Kroměříži', centerX, 109 * scale, `600 ${8 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, muted, 160 * scale, 1.18);
  text(ctx, 'DÁRKOVÁ KARTA · DIGITÁLNÍ DORUČENÍ E-MAILEM', centerX, 120 * scale, `700 ${5.8 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent);

  // Secure card information strip.
  if (options.cardCode) {
    rounded(ctx, 28 * scale, 125 * scale, 154 * scale, 10.5 * scale, 2.5 * scale, `${theme.bg}88`, `${accent}70`, .35 * scale);
    text(ctx, `ČÍSLO KARTY  ${options.cardCode}`, 72 * scale, 132 * scale, `700 ${5.8 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, main, 78 * scale);
    text(ctx, `BEZPEČNOSTNÍ KÓD  ${options.securityCode || ''}`, 138 * scale, 132 * scale, `700 ${5.8 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent, 78 * scale);
  } else {
    text(ctx, 'DÁRKOVOU KARTU LZE ČERPAT POSTUPNĚ PŘI VÍCE NÁKUPECH AŽ DO VYČERPÁNÍ JEJÍ HODNOTY.', centerX, 132 * scale, `600 ${5.6 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, muted, 168 * scale, 1.15);
  }

  // Tiny premium footer mark.
  text(ctx, 'LUVIA DECOR  •  KROMĚŘÍŽ', centerX, 141.5 * scale, `700 ${4.5 * 1.333}px Arial, "Noto Sans", "Segoe UI", sans-serif`, accent);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 148, undefined, 'FAST');
  const suffix = options.cardCode || `${options.amount}Kc`;
  pdf.save(`Luvia-Decor-Darkova-karta-${suffix}.pdf`);
};
