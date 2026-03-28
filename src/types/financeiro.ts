export type TransactionType = "INCOME" | "EXPENSE";

export interface FinanceCategory {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string | null;
  budgetAmount: string | null;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  description: string;
  amount: string;
  type: TransactionType;
  date: Date;
  notes: string | null;
  categoryId: string;
  category: FinanceCategory;
  isRecurring: boolean;
  recurrenceRule: string | null;
  recurrenceEnd: Date | null;
  parentId: string | null;
  paid: boolean;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  notes?: string;
  categoryId: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: string;
  paid?: boolean;
  dueDate?: string;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  paidAt?: string | null;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType;
  categoryId?: string;
  paid?: boolean;
  search?: string;
}

export interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  month: number;
  year: number;
}

export interface BudgetSummary {
  totalLimit: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  categories: CategoryBudgetItem[];
}

export interface CategoryBudgetItem {
  categoryId: string;
  categoryName: string;
  color: string;
  budgetAmount: number | null;
  spent: number;
  percentage: number | null;
}
