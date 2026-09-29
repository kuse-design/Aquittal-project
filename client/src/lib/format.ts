export function money(value: string | number, currencyCode: string) {
  const amount = typeof value === "string" ? Number(value) : value;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
