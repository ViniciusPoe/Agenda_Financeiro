export const EVENT_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const EVENT_PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
};

export const EVENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  INCOME: "text-green-600",
  EXPENSE: "text-red-600",
};

export const DEFAULT_AGENDA_CATEGORIES = [
  { name: "Trabalho", color: "#3B82F6", icon: "briefcase" },
  { name: "Pessoal", color: "#8B5CF6", icon: "user" },
  { name: "Saude", color: "#10B981", icon: "heart" },
  { name: "Financeiro", color: "#F59E0B", icon: "dollar-sign" },
  { name: "Educacao", color: "#6366F1", icon: "book" },
  { name: "Outros", color: "#6B7280", icon: "more-horizontal" },
];

export const DEFAULT_FINANCE_CATEGORIES = [
  { name: "Salario", type: "INCOME", color: "#10B981", icon: "trending-up" },
  { name: "Freelance", type: "INCOME", color: "#3B82F6", icon: "dollar-sign" },
  { name: "Outros rendimentos", type: "INCOME", color: "#8B5CF6", icon: "plus-circle" },
  { name: "Alimentacao", type: "EXPENSE", color: "#F59E0B", icon: "utensils" },
  { name: "Moradia", type: "EXPENSE", color: "#EF4444", icon: "home" },
  { name: "Transporte", type: "EXPENSE", color: "#F97316", icon: "car" },
  { name: "Saude", type: "EXPENSE", color: "#EC4899", icon: "heart" },
  { name: "Educacao", type: "EXPENSE", color: "#6366F1", icon: "book" },
  { name: "Lazer", type: "EXPENSE", color: "#14B8A6", icon: "smile" },
  { name: "Vestuario", type: "EXPENSE", color: "#A855F7", icon: "shopping-bag" },
  { name: "Assinaturas", type: "EXPENSE", color: "#06B6D4", icon: "repeat" },
  { name: "Outros", type: "EXPENSE", color: "#6B7280", icon: "more-horizontal" },
];

export const RECURRENCE_OPTIONS = [
  { label: "Nao repetir", value: "" },
  { label: "Diariamente", value: "FREQ=DAILY" },
  { label: "Semanalmente", value: "FREQ=WEEKLY" },
  { label: "Mensalmente", value: "FREQ=MONTHLY" },
  { label: "Anualmente", value: "FREQ=YEARLY" },
];
