export const formatMoney = (value: unknown): string =>
  Number(value ?? 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
