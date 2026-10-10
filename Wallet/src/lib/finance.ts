/**
 * Shared financial calculation helpers.
 *
 * These encode the app's "financial correctness rules" in one place so no
 * page duplicates (or drifts from) the logic:
 *   - PF and Investments are their own asset buckets, never folded into cash.
 *   - Employee PF is a salary deduction, never an expense.
 *   - Monthly Wealth Growth = (Net Salary + Other Income − Expenses) + Employee PF + Employer PF.
 *     Moving leftover cash into an investment only shifts value between asset
 *     buckets, so it never needs to be added again as a separate term.
 */

export type CashFlowInput = {
  netSalary: number;
  otherIncome: number;
  expenses: number;
};

export function cashFlowRemaining({
  netSalary,
  otherIncome,
  expenses,
}: CashFlowInput): number {
  return netSalary + otherIncome - expenses;
}

export function savingsRate({ netSalary, otherIncome, expenses }: CashFlowInput): number {
  const income = netSalary + otherIncome;
  if (income <= 0) return 0;
  return (cashFlowRemaining({ netSalary, otherIncome, expenses }) / income) * 100;
}

export function monthlyWealthGrowth({
  netSalary,
  otherIncome,
  expenses,
  employeePF,
  employerPF,
}: CashFlowInput & { employeePF: number; employerPF: number }): number {
  return (
    cashFlowRemaining({ netSalary, otherIncome, expenses }) + employeePF + employerPF
  );
}

export function netWorth({
  totalAssets,
  pfBalance,
  totalInvestments,
  totalLiabilities,
}: {
  totalAssets: number;
  pfBalance: number;
  totalInvestments: number;
  totalLiabilities: number;
}): number {
  return totalAssets + pfBalance + totalInvestments - totalLiabilities;
}

export function salaryDeductionBreakdown({
  gross,
  employeePFPercent,
  incomeTax,
  professionalTax,
  otherDeductions,
}: {
  gross: number;
  employeePFPercent: number;
  incomeTax: number;
  professionalTax: number;
  otherDeductions: number;
}) {
  const employeePF = (gross * employeePFPercent) / 100;
  const netSalary = gross - employeePF - incomeTax - professionalTax - otherDeductions;
  return { employeePF, netSalary };
}

/** Simple annualized return between two dated values (no intermediate cash flows). */
export function cagr({
  startValue,
  endValue,
  years,
}: {
  startValue: number;
  endValue: number;
  years: number;
}): number {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export type CashFlow = { date: Date; amount: number };

/**
 * XIRR via Newton-Raphson with a bisection fallback.
 * Convention: outflows (money invested) are negative, the final current
 * value is a positive inflow.
 */
export function xirr(cashFlows: CashFlow[], guess = 0.15): number | null {
  if (cashFlows.length < 2) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const years = sorted.map((cf) => (cf.date.getTime() - t0) / (365 * 24 * 60 * 60 * 1000));

  const npv = (rate: number) =>
    sorted.reduce((sum, cf, i) => sum + cf.amount / Math.pow(1 + rate, years[i]), 0);
  const dnpv = (rate: number) =>
    sorted.reduce(
      (sum, cf, i) => sum - (years[i] * cf.amount) / Math.pow(1 + rate, years[i] + 1),
      0
    );

  let rate = guess;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    const deriv = dnpv(rate);
    if (Math.abs(deriv) < 1e-10) break;
    const next = rate - value / deriv;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) {
      rate = next;
      break;
    }
    rate = next;
  }

  if (!Number.isFinite(rate) || rate <= -1) {
    // Bisection fallback across a wide, sane range.
    let lo = -0.99;
    let hi = 10;
    let loVal = npv(lo);
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const midVal = npv(mid);
      if (Math.abs(midVal) < 1e-6) return mid * 100;
      if ((loVal < 0) === (midVal < 0)) {
        lo = mid;
        loVal = midVal;
      } else {
        hi = mid;
      }
    }
    return ((lo + hi) / 2) * 100;
  }

  return rate * 100;
}

export function returnPercent({
  invested,
  currentValue,
}: {
  invested: number;
  currentValue: number;
}): number {
  if (invested <= 0) return 0;
  return ((currentValue - invested) / invested) * 100;
}

export function requiredMonthlyContribution({
  targetAmount,
  currentAmount,
  targetDate,
  fromDate = new Date(),
}: {
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  fromDate?: Date;
}): number {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;

  const months = Math.max(
    1,
    Math.ceil(
      (targetDate.getFullYear() - fromDate.getFullYear()) * 12 +
        (targetDate.getMonth() - fromDate.getMonth())
    )
  );
  return remaining / months;
}

export function goalProgressPercent({
  targetAmount,
  currentAmount,
}: {
  targetAmount: number;
  currentAmount: number;
}): number {
  if (targetAmount <= 0) return 0;
  return Math.min(100, (currentAmount / targetAmount) * 100);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Projects a deposit's value under standard quarterly-compounded interest
 * (the convention Indian bank FDs/RDs use), from a deposit date to now.
 */
export function compoundedValue({
  principal,
  annualRatePercent,
  fromDate,
  toDate = new Date(),
  compoundsPerYear = 4,
}: {
  principal: number;
  annualRatePercent: number;
  fromDate: Date;
  toDate?: Date;
  compoundsPerYear?: number;
}): number {
  if (principal <= 0) return 0;
  const years = Math.max(0, (toDate.getTime() - fromDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
  const rate = annualRatePercent / 100;
  return principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * years);
}
