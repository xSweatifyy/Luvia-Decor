import { jsPDF } from 'jspdf';

export type GiftCardPdfOptions = {
  amount: number;
  cardCode?: string;
  securityCode?: string;
  slogan?: string;
  logoText?: string;
  design?: string;
};

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const wrapText = (ctx: CanvasRenderingContext2D, value: string, maxWidth: number) => {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(next).width <= maxWidth) current = next;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
};

const drawText = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, maxWidth?: number, lineHeight = 1.18) => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lines = maxWidth ? wrapText(ctx, value, maxWidth) : [value];
  const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] || 16);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * size * lineHeight));
};

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, width = 1) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
};

const divider = (ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string, width: number) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
};

const drawBotanical = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, flip = false, color = '#D8AE63') => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((flip ? -1 : 1) * scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.globalAlpha = .92;
  ctx.beginPath();
  ctx.moveTo(0, 72);
  ctx.bezierCurveTo(8, 51, 19, 26, 51, 0);
  ctx.stroke();
  const leaves = [[8, 53, -30], [15, 41, 28], [23, 29, -27], [32, 19, 26], [42, 8, -21]];
  leaves.forEach(([lx, ly, angle]) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(8, -8, 16, -7, 19, 0);
    ctx.bezierCurveTo(12, 5, 5, 5, 0, 0);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
};

const drawBow = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#C99143';
  ctx.strokeStyle = '#F1D49B';
  ctx.lineWidth = .55;
  const path = (side: number) => {
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(side * 18, -16, side * 42, -13, side * 35, 3);
    ctx.bezierCurveTo(side * 29, 14, side * 11, 12, 0, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  path(-1); path(1);
  ctx.beginPath(); ctx.arc(0, 4, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, 8); ctx.lineTo(-18, 32); ctx.lineTo(-5, 24); ctx.lineTo(3, 9); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(18, 32); ctx.lineTo(5, 24); ctx.lineTo(-3, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
};

export const createGiftCardPdf = async (options: GiftCardPdfOptions) => {
  if (typeof document === 'undefined') throw new Error('PDF lze vytvořit pouze v prohlížeči.');
  if (document.fonts?.ready) await document.fonts.ready;

  const scale = 8;
  const width = 210 * scale;
  const height = 148 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Nepodařilo se připravit dárkovou kartu.');

  const gold = '#D8AE63';
  const goldLight = '#F5DDA9';
  const cream = '#FFF8E9';
  const muted = '#E3D7C4';
  const center = 105 * scale;
  const S = (n: number) => n * scale;
  const sans = 'Arial, "Noto Sans", "Segoe UI", sans-serif';
  const serif = 'Georgia, "Times New Roman", serif';

  // Fixed luxury theme matching the approved reference. The design selector is intentionally not used here.
  const bg = ctx.createRadialGradient(S(105), S(67), S(5), S(105), S(70), S(145));
  bg.addColorStop(0, '#21170C');
  bg.addColorStop(.45, '#0F0B07');
  bg.addColorStop(1, '#050403');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle marble / satin texture.
  ctx.save();
  ctx.globalAlpha = .14;
  ctx.strokeStyle = '#8D6737';
  ctx.lineWidth = S(.55);
  for (let i = -2; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(S(i * 44), S(150));
    ctx.bezierCurveTo(S(24 + i * 29), S(111), S(60 + i * 23), S(37), S(100 + i * 29), S(-8));
    ctx.stroke();
  }
  ctx.restore();

  // Three-layer luxury frame.
  rounded(ctx, S(5.5), S(4.5), S(199), S(139), S(4.5), undefined, goldLight, S(.75));
  rounded(ctx, S(8.5), S(7.5), S(193), S(133), S(3.5), undefined, gold, S(.3));
  rounded(ctx, S(10.5), S(9.5), S(189), S(129), S(2.5), undefined, '#76562D', S(.18));

  drawBotanical(ctx, S(12), S(14), .92, false, gold);
  drawBotanical(ctx, S(198), S(136), .92, true, gold);
  drawBotanical(ctx, S(15), S(133), .63, false, gold);
  drawBotanical(ctx, S(195), S(17), .63, true, gold);
  drawBow(ctx, S(188), S(11), 1.0);

  // Header and brand.
  drawText(ctx, String(options.logoText || 'LUVIA DECOR').toUpperCase(), center, S(25), `700 ${S(15.5)}px ${serif}`, goldLight);
  divider(ctx, S(69), S(97), S(30), gold, S(.45));
  divider(ctx, S(113), S(141), S(30), gold, S(.45));
  drawText(ctx, '♡', center, S(31.8), `400 ${S(7)}px ${serif}`, goldLight);
  drawText(ctx, 'KVĚTINOVÝ ATELIÉR  ·  DEKORACE  ·  KROMĚŘÍŽ', center, S(37), `700 ${S(5.8)}px ${sans}`, cream);

  drawText(ctx, 'DÁRKOVÁ KARTA', center, S(57), `700 ${S(18.5)}px ${serif}`, cream);
  divider(ctx, S(61), S(97), S(63), gold, S(.5));
  divider(ctx, S(113), S(149), S(63), gold, S(.5));
  drawText(ctx, '♥', center, S(64.5), `400 ${S(7)}px ${sans}`, goldLight);
  drawText(ctx, 'S LÁSKOU PRO VÁS', center, S(72), `700 ${S(7)}px ${sans}`, goldLight);

  // Main value plaque.
  const plaque = ctx.createLinearGradient(S(48), S(79), S(162), S(104));
  plaque.addColorStop(0, '#1A1209');
  plaque.addColorStop(.5, '#080604');
  plaque.addColorStop(1, '#1A1209');
  rounded(ctx, S(49), S(78), S(112), S(26), S(3.2), plaque, goldLight, S(.65));
  rounded(ctx, S(51), S(80), S(108), S(22), S(2.4), undefined, gold, S(.22));
  drawText(ctx, 'HODNOTA', center, S(86), `700 ${S(5.8)}px ${sans}`, goldLight);
  drawText(ctx, `${money(options.amount)} Kč`, center, S(98), `700 ${S(17.5)}px ${serif}`, goldLight);

  // Brand promise.
  drawText(ctx, options.slogan || 'Ručně tvořené dekorace a květinový ateliér v Kroměříži', center, S(111), `600 ${S(7.6)}px ${serif}`, cream, S(174), 1.15);

  // Real/admin cards have codes; customer preview deliberately does not.
  if (options.cardCode) {
    rounded(ctx, S(31), S(115), S(148), S(14), S(2.5), '#080604D9', '#9C763E', S(.35));
    divider(ctx, S(105), S(105), S(117), '#76562D', S(.3));
    drawText(ctx, 'ČÍSLO DÁRKOVÉ KARTY', S(68), S(120), `700 ${S(4.7)}px ${sans}`, goldLight);
    drawText(ctx, String(options.cardCode), S(68), S(125.8), `700 ${S(6.4)}px ${sans}`, cream);
    drawText(ctx, 'BEZPEČNOSTNÍ KÓD', S(142), S(120), `700 ${S(4.7)}px ${sans}`, goldLight);
    drawText(ctx, String(options.securityCode || ''), S(142), S(125.8), `700 ${S(6.4)}px ${sans}`, cream);
  } else {
    drawText(ctx, 'Digitální dárková karta · doručení e-mailem', center, S(119), `600 ${S(6.5)}px ${sans}`, muted);
    drawText(ctx, 'Kód a bezpečnostní kód obdržíte po zaplacení dárkové karty.', center, S(125), `600 ${S(6.1)}px ${sans}`, muted, S(178), 1.1);
  }

  divider(ctx, S(72), S(97), S(132), gold, S(.45));
  divider(ctx, S(113), S(138), S(132), gold, S(.45));
  drawText(ctx, '♥', center, S(133.8), `400 ${S(5.5)}px ${sans}`, goldLight);
  drawText(ctx, 'UPLATNĚNÍ POUZE PŘES E-SHOP', center, S(137.5), `700 ${S(6.1)}px ${sans}`, goldLight);
  drawText(ctx, 'LUVIA DECOR  ·  KROMĚŘÍŽ', center, S(142), `700 ${S(5.2)}px ${sans}`, gold);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 148, undefined, 'FAST');
  const suffix = options.cardCode || `${options.amount}Kc`;
  pdf.save(`Luvia-Decor-Darkova-karta-${suffix}.pdf`);
};
