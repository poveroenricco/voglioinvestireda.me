export const MAX_DEDUCTIBLE = 5164.57;

export const getFundTaxSaving = (ral: number, annualContribution: number, years: number = 1) => {
  const deductibleContribution = Math.min(annualContribution, MAX_DEDUCTIBLE);

  const brackets = [
    { upperLimit: 28000, rate: 0.23 },
    { upperLimit: 50000, rate: 0.35 },
    { upperLimit: Infinity, rate: 0.43 },
  ];

  let taxSaving = 0;
  let remainingIncome = ral;
  let remainingContribution = deductibleContribution;

  for (let i = brackets.length - 1; i >= 0; i--) {
    const { rate } = brackets[i];
    const lowerLimit = i > 0 ? brackets[i - 1].upperLimit : 0;

    if (ral > lowerLimit) {
      const incomeInBracket = Math.min(remainingIncome - lowerLimit, remainingContribution);

      if (incomeInBracket > 0) {
        taxSaving += incomeInBracket * rate;
        remainingContribution -= incomeInBracket;
        remainingIncome = lowerLimit;

        if (remainingContribution <= 0) {
          break;
        }
      }
    }
  }

  return taxSaving * years;
};

export const getFundTax = (years: number) => {
  if (years < 15) return 0.23;

  const BASE_TAX = 0.15;
  const MIN_TAX = 0.09;
  const START_REDUCTION_YEAR = 15;
  const REDUCTION_PER_YEAR = 0.003;

  if (years <= START_REDUCTION_YEAR) return BASE_TAX;

  const reductionYears = Math.min(years - START_REDUCTION_YEAR, 20);
  const reducedTax = BASE_TAX - reductionYears * REDUCTION_PER_YEAR;

  return Math.max(reducedTax, MIN_TAX);
};
