import { jsPDF } from 'jspdf';

export type GiftCardPdfOptions = {
  amount: number;
  cardCode?: string;
  securityCode?: string;
  slogan?: string;
  logoText?: string;
  design?: string;
};

const money = (n: number) => Number(n || 0).toLocaleString('cs-CZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

const drawText = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
  maxWidth?: number,
  lineHeight = 1.2,
  maxLines = 2,
) => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let lines = maxWidth ? wrapText(ctx, value, maxWidth) : [value];
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1].replace(/[.,;:!?\-–—\s]+$/, '');
    lines[maxLines - 1] = `${last}…`;
  }
  const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] || 16);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * size * lineHeight));
};

const rounded = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  width = 1,
) => {
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

  // True A4 landscape artwork: 297 × 210 mm. The previous version stretched
  // an A5 coordinate system over A4, which made the typography look cramped.
  const scale = 8;
  const W = 297;
  const H = 210;
  const width = W * scale;
  const height = H * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Nepodařilo se připravit dárkovou kartu.');

  const S = (n: number) => n * scale;
  const center = S(W / 2);
  const gold = '#D8AE63';
  const goldLight = '#F5DDA9';
  const cream = '#FFF8E9';
  const muted = '#D8CDBD';
  const sans = 'Arial, "Noto Sans", "Segoe UI", sans-serif';
  const serif = 'Georgia, "Times New Roman", serif';

  const bg = ctx.createRadialGradient(S(148.5), S(82), S(8), S(148.5), S(95), S(220));
  bg.addColorStop(0, '#24180C');
  bg.addColorStop(.48, '#100B07');
  bg.addColorStop(1, '#050403');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = .13;
  ctx.strokeStyle = '#8D6737';
  ctx.lineWidth = S(.55);
  for (let i = -3; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(S(i * 52), S(210));
    ctx.bezierCurveTo(S(35 + i * 31), S(145), S(86 + i * 24), S(55), S(145 + i * 31), S(-15));
    ctx.stroke();
  }
  ctx.restore();

  // Elegant A4 frame with generous outer margins.
  rounded(ctx, S(8), S(7), S(281), S(196), S(5), undefined, goldLight, S(.8));
  rounded(ctx, S(11), S(10), S(275), S(190), S(4), undefined, gold, S(.3));
  rounded(ctx, S(14), S(13), S(269), S(184), S(3), undefined, '#76562D', S(.18));

  drawBotanical(ctx, S(17), S(20), 1.02, false, gold);
  drawBotanical(ctx, S(280), S(190), 1.02, true, gold);
  drawBotanical(ctx, S(22), S(183), .72, false, gold);
  drawBotanical(ctx, S(275), S(25), .72, true, gold);
  drawBow(ctx, S(268), S(17), .82);

  // HEADER — smaller type and wider spacing.
  drawText(ctx, String(options.logoText || 'LUVIA DECOR').toUpperCase(), center, S(31), `700 ${S(11)}px ${serif}`, goldLight);
  divider(ctx, S(108), S(137), S(37), gold, S(.45));
  divider(ctx, S(160), S(189), S(37), gold, S(.45));
  drawText(ctx, '♡', center, S(40), `400 ${S(5.5)}px ${serif}`, goldLight);
  drawText(ctx, 'KVĚTINOVÝ ATELIÉR  ·  DEKORACE  ·  KROMĚŘÍŽ', center, S(48), `700 ${S(4.4)}px ${sans}`, cream, S(220), 1.05, 1);

  // TITLE — isolated from the value block.
  drawText(ctx, 'DÁRKOVÁ KARTA', center, S(68), `700 ${S(14)}px ${serif}`, cream);
  divider(ctx, S(82), S(132), S(73), gold, S(.45));
  divider(ctx, S(165), S(215), S(73), gold, S(.45));
  drawText(ctx, '♥', center, S(77), `400 ${S(5.5)}px ${sans}`, goldLight);
  drawText(ctx, 'S LÁSKOU PRO VÁS', center, S(85), `700 ${S(5.2)}px ${sans}`, goldLight);

  // VALUE — compact, centered and visually dominant without oversized text.
  const plaque = ctx.createLinearGradient(S(86), S(94), S(211), S(127));
  plaque.addColorStop(0, '#1A1209');
  plaque.addColorStop(.5, '#080604');
  plaque.addColorStop(1, '#1A1209');
  rounded(ctx, S(87), S(92), S(123), S(35), S(4), plaque, goldLight, S(.65));
  rounded(ctx, S(90), S(95), S(117), S(29), S(3), undefined, gold, S(.22));
  drawText(ctx, 'HODNOTA', center, S(103), `700 ${S(4.7)}px ${sans}`, goldLight);
  drawText(ctx, `${money(options.amount)} Kč`, center, S(119), `700 ${S(15)}px ${serif}`, goldLight);

  // SLOGAN — maximum two short lines, well separated from codes.
  drawText(
    ctx,
    options.slogan || 'Ručně tvořené dekorace a květinový ateliér v Kroměříži',
    center,
    S(140),
    `600 ${S(5.2)}px ${serif}`,
    cream,
    S(225),
    1.22,
    2,
  );

  // CODES — a clean, symmetric two-column card.
  if (options.cardCode) {
    rounded(ctx, S(49), S(151), S(199), S(28), S(3.5), '#080604E8', '#9C763E', S(.4));
    divider(ctx, S(148.5), S(148.5), S(156), '#76562D', S(.35));
    drawText(ctx, 'ČÍSLO DÁRKOVÉ KARTY', S(99), S(160), `700 ${S(4.1)}px ${sans}`, goldLight, S(82), 1.05, 1);
    drawText(ctx, String(options.cardCode), S(99), S(171), `700 ${S(5.8)}px ${sans}`, cream, S(84), 1.05, 1);
    drawText(ctx, 'BEZPEČNOSTNÍ KÓD', S(198), S(160), `700 ${S(4.1)}px ${sans}`, goldLight, S(82), 1.05, 1);
    drawText(ctx, String(options.securityCode || ''), S(198), S(171), `700 ${S(5.8)}px ${sans}`, cream, S(84), 1.05, 1);
  } else {
    drawText(ctx, 'Digitální dárková karta · doručení e-mailem', center, S(158), `600 ${S(5.1)}px ${sans}`, muted, S(220), 1.05, 1);
    drawText(ctx, 'Kód a bezpečnostní kód obdržíte po zaplacení dárkové karty.', center, S(168), `600 ${S(4.8)}px ${sans}`, muted, S(220), 1.1, 1);
  }

  // FOOTER — deliberately low and separated from the code panel.
  divider(ctx, S(106), S(137), S(186), gold, S(.45));
  divider(ctx, S(160), S(191), S(186), gold, S(.45));
  drawText(ctx, '♥', center, S(190), `400 ${S(4.8)}px ${sans}`, goldLight);
  drawText(ctx, 'UPLATNĚNÍ POUZE PŘES E-SHOP', center, S(196), `700 ${S(4.7)}px ${sans}`, goldLight, S(190), 1.05, 1);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, W, H, undefined, 'FAST');
  const suffix = options.cardCode || `${options.amount}Kc`;
  pdf.save(`Luvia-Decor-Darkova-karta-${suffix}.pdf`);
};
