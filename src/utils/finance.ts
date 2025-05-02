export const applyGain = (amount: number, rate: number): number => amount * (1 + rate);

export const getGain = (initialAmount: number, finalAmount: number, years: number = 1): number =>
  ((finalAmount - initialAmount) / initialAmount) * (1 / years);

export const applyTax = (amount: number, rate: number): number => amount * (1 - rate);

export const getAvgTaxRate = (ral: number) => {
  let irpef = 0;

  if (ral <= 28000) {
    irpef = ral * 0.23;
  } else if (ral <= 50000) {
    irpef = 28000 * 0.23 + (ral - 28000) * 0.35;
  } else {
    irpef = 28000 * 0.23 + (50000 - 28000) * 0.35 + (ral - 50000) * 0.43;
  }

  const avgTaxRate = irpef / ral;
  return avgTaxRate;
};
