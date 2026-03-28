import { z } from "zod";

// ============================================
// AGENDA
// ============================================

export const createEventSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio").max(255),
  description: z.string().max(5000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora invalida").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora invalida").optional(),
  allDay: z.boolean().optional().default(false),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional().default("PENDING"),
  categoryId: z.string().cuid().optional(),
  recurrenceRule: z.string().max(500).optional(),
  recurrenceEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reminderMinutes: z.number().int().min(0).optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  completedAt: z.string().datetime().nullable().optional(),
});

export const eventFiltersSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  categoryId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
});

// ============================================
// FINANCEIRO
// ============================================

export const createTransactionSchema = z.object({
  description: z.string().min(1, "Descricao obrigatoria").max(255),
  amount: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
  notes: z.string().max(5000).optional(),
  categoryId: z.string().min(1, "Categoria obrigatoria"),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.string().max(500).optional(),
  recurrenceEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paid: z.boolean().optional().default(false),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  paidAt: z.string().datetime().nullable().optional(),
});

export const transactionFiltersSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().optional(),
  paid: z.string().transform((v) => v === "true").optional(),
  search: z.string().max(100).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor invalida"),
  icon: z.string().max(50).optional(),
  budgetAmount: z.number().positive().optional(),
});

export const budgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  totalLimit: z.number().positive("Limite deve ser positivo"),
  notes: z.string().max(500).optional(),
});

// ============================================
// AUTH
// ============================================

export const loginSchema = z.object({
  password: z.string().min(1, "Senha obrigatoria"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
