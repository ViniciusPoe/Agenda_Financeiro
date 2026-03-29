import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida");

const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Hora invalida");

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,2})?$/, "Valor invalido")
  .transform((value) => value.replace(",", "."));

// ============================================
// AGENDA
// ============================================

export const createEventSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio").max(255),
  description: z.string().max(5000).optional(),
  date: dateStringSchema,
  startTime: z.preprocess(emptyStringToUndefined, timeStringSchema.optional()),
  endTime: z.preprocess(emptyStringToUndefined, timeStringSchema.optional()),
  allDay: z.boolean().optional().default(false),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .optional()
    .default("MEDIUM"),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional()
    .default("PENDING"),
  categoryId: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1, "Categoria invalida").optional()
  ),
  recurrenceRule: z.preprocess(
    emptyStringToUndefined,
    z.string().max(500).optional()
  ),
  recurrenceEnd: z.preprocess(
    emptyStringToUndefined,
    dateStringSchema.optional()
  ),
  isFreelancer: z.boolean().optional().default(false),
  freelanceAmount: z.preprocess(
    emptyStringToNull,
    z.union([decimalStringSchema, z.null()]).optional()
  ),
});

export const updateEventSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio").max(255).optional(),
  description: z.string().max(5000).optional(),
  date: dateStringSchema.optional(),
  startTime: z.preprocess(
    emptyStringToNull,
    z.union([timeStringSchema, z.null()]).optional()
  ),
  endTime: z.preprocess(
    emptyStringToNull,
    z.union([timeStringSchema, z.null()]).optional()
  ),
  allDay: z.boolean().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  categoryId: z.preprocess(
    emptyStringToNull,
    z.union([z.string().min(1, "Categoria invalida"), z.null()]).optional()
  ),
  recurrenceRule: z.preprocess(
    emptyStringToNull,
    z.union([z.string().max(500), z.null()]).optional()
  ),
  recurrenceEnd: z.preprocess(
    emptyStringToNull,
    z.union([dateStringSchema, z.null()]).optional()
  ),
  isFreelancer: z.boolean().optional(),
  freelanceAmount: z.preprocess(
    emptyStringToNull,
    z.union([decimalStringSchema, z.null()]).optional()
  ),
  completedAt: z.string().datetime().nullable().optional(),
});

export const eventFiltersSchema = z.object({
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  categoryId: z.string().min(1, "Categoria invalida").optional(),
  parentEventId: z.string().min(1, "Evento pai invalido").optional(),
  search: z.string().max(100).optional(),
});

// ============================================
// FINANCEIRO
// ============================================

export const createTransactionSchema = z
  .object({
    description: z.string().min(1, "Descricao obrigatoria").max(255),
    amount: z.number().positive("Valor deve ser positivo"),
    type: z.enum(["INCOME", "EXPENSE"]),
    date: dateStringSchema,
    notes: z.string().max(5000).optional(),
    categoryId: z.string().min(1, "Categoria obrigatoria"),
    isRecurring: z.boolean().optional().default(false),
    recurrenceRule: z.preprocess(
      emptyStringToUndefined,
      z.string().max(500).optional()
    ),
    recurrenceEnd: z.preprocess(
      emptyStringToUndefined,
      dateStringSchema.optional()
    ),
    paid: z.boolean().optional().default(false),
    dueDate: z.preprocess(emptyStringToUndefined, dateStringSchema.optional()),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurrenceRule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceRule"],
        message: "Regra de recorrencia obrigatoria para transacoes recorrentes",
      });
    }

    if (data.recurrenceEnd && !data.recurrenceRule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceRule"],
        message: "Defina a regra antes de informar a data final da recorrencia",
      });
    }
  });

export const updateTransactionSchema = z
  .object({
    description: z.string().min(1, "Descricao obrigatoria").max(255).optional(),
    amount: z.number().positive("Valor deve ser positivo").optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    date: dateStringSchema.optional(),
    notes: z.preprocess(
      emptyStringToNull,
      z.union([z.string().max(5000), z.null()]).optional()
    ),
    categoryId: z.string().min(1, "Categoria obrigatoria").optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.preprocess(
      emptyStringToNull,
      z.union([z.string().max(500), z.null()]).optional()
    ),
    recurrenceEnd: z.preprocess(
      emptyStringToNull,
      z.union([dateStringSchema, z.null()]).optional()
    ),
    paid: z.boolean().optional(),
    dueDate: z.preprocess(
      emptyStringToNull,
      z.union([dateStringSchema, z.null()]).optional()
    ),
    paidAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring === true && !data.recurrenceRule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceRule"],
        message: "Regra de recorrencia obrigatoria para transacoes recorrentes",
      });
    }
  });

export const transactionFiltersSchema = z.object({
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().optional(),
  paid: z.string().transform((v) => v === "true").optional(),
  search: z.string().max(100).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const createAgendaCategorySchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor invalida"),
  icon: z.string().max(50).optional(),
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
