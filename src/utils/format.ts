export const formatCurrency = (value: number, currency: string = "EUR"): string => {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat("it-IT", options).format(value);
};

export const formatPercentage = (value: number): string => {
  const options: Intl.NumberFormatOptions = {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat("it-IT", options).format(value);
};
