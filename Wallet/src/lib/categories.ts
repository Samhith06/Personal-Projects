export const EXPENSE_CATEGORIES = [
  "RENT",
  "FOOD",
  "GROCERIES",
  "TRAVEL",
  "TRANSPORT",
  "SHOPPING",
  "ENTERTAINMENT",
  "BILLS",
  "HEALTHCARE",
  "EDUCATION",
  "FAMILY",
  "SUBSCRIPTIONS",
  "INSURANCE",
  "OTHER",
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent",
  FOOD: "Food",
  GROCERIES: "Groceries",
  TRAVEL: "Travel",
  TRANSPORT: "Transport",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  BILLS: "Bills",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  FAMILY: "Family",
  SUBSCRIPTIONS: "Subscriptions",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

export const CATEGORY_COLORS: Record<string, string> = {
  RENT: "#6366f1",
  FOOD: "#f97316",
  GROCERIES: "#34d399",
  TRAVEL: "#38bdf8",
  TRANSPORT: "#a78bfa",
  SHOPPING: "#f472b6",
  ENTERTAINMENT: "#facc15",
  BILLS: "#f87171",
  HEALTHCARE: "#2dd4bf",
  EDUCATION: "#818cf8",
  FAMILY: "#fb923c",
  SUBSCRIPTIONS: "#c084fc",
  INSURANCE: "#4ade80",
  OTHER: "#94a3b8",
};

export const PAYMENT_METHODS = [
  "Cash",
  "Debit Card",
  "Credit Card",
  "UPI",
  "Net Banking",
  "Other",
];

export const INVESTMENT_TYPES = [
  "SIP",
  "MUTUAL_FUND",
  "STOCK",
  "RECURRING_DEPOSIT",
  "FIXED_DEPOSIT",
  "PPF",
  "NPS",
  "GOLD",
  "SILVER",
  "BOND",
  "OTHER",
] as const;

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  SIP: "SIP",
  MUTUAL_FUND: "Mutual Fund",
  STOCK: "Stock",
  RECURRING_DEPOSIT: "Recurring Deposit",
  FIXED_DEPOSIT: "Fixed Deposit",
  PPF: "PPF",
  NPS: "NPS",
  GOLD: "Gold",
  SILVER: "Silver",
  BOND: "Bond",
  OTHER: "Other",
};

export const INVESTMENT_TYPE_COLORS: Record<string, string> = {
  SIP: "#6366f1",
  MUTUAL_FUND: "#38bdf8",
  STOCK: "#f97316",
  RECURRING_DEPOSIT: "#34d399",
  FIXED_DEPOSIT: "#facc15",
  PPF: "#818cf8",
  NPS: "#c084fc",
  GOLD: "#d4af6a",
  SILVER: "#c0c0c0",
  BOND: "#4ade80",
  OTHER: "#94a3b8",
};

/** Investment types that track a live per-gram market price. */
export const METAL_INVESTMENT_TYPES = ["GOLD", "SILVER"] as const;

export const ASSET_CATEGORIES = ["CASH", "BANK", "PROPERTY", "OTHER"] as const;
export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank account",
  PROPERTY: "Property",
  OTHER: "Other",
};

export const LIABILITY_CATEGORIES = [
  "CREDIT_CARD",
  "PERSONAL_LOAN",
  "CAR_LOAN",
  "HOME_LOAN",
  "BNPL",
  "OTHER",
] as const;
export const LIABILITY_CATEGORY_LABELS: Record<string, string> = {
  CREDIT_CARD: "Credit card debt",
  PERSONAL_LOAN: "Personal loan",
  CAR_LOAN: "Car loan",
  HOME_LOAN: "Home loan",
  BNPL: "Buy now, pay later",
  OTHER: "Other",
};
