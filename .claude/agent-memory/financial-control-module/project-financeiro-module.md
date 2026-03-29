---
name: financial-module-implementation
description: Fases 5, 6, 7 do módulo financeiro — estrutura de arquivos, padrões de API, lógica de saldo e orçamento
type: project
---

Implementação completa das Fases 5, 6 e 7 do módulo financeiro concluída com build passando.

**Why:** Módulo financeiro do sistema de agenda pessoal com controle de receitas, despesas, saldo e orçamento.

**How to apply:** Referência para futuras fases (recorrência, relatórios avançados, integração).

## Arquivos criados

### API Routes
- `src/app/api/financeiro/transacoes/route.ts` — GET (paginado, filtros) + POST
- `src/app/api/financeiro/transacoes/[id]/route.ts` — GET + PUT + DELETE (verifica filhos recorrentes)
- `src/app/api/financeiro/categorias/route.ts` — GET (?type=INCOME|EXPENSE) + POST
- `src/app/api/financeiro/categorias/[id]/route.ts` — PUT + DELETE (verifica FK)
- `src/app/api/financeiro/saldo/route.ts` — GET ?month&year → saldo do mês usando Prisma _sum
- `src/app/api/financeiro/relatorios/route.ts` — GET → byCategory, byMonth (12 meses), summary
- `src/app/api/financeiro/orcamento/route.ts` — GET + PUT (upsert) → Budget + gastos por categoria

### Páginas (app router)
- `src/app/(app)/financeiro/page.tsx` — Dashboard com BalanceCard, ExpenseChart, IncomeVsExpense, MonthlySummary, últimas 5 transações
- `src/app/(app)/financeiro/transacoes/page.tsx` — Lista paginada com filtros e summary de período
- `src/app/(app)/financeiro/transacoes/nova/page.tsx` — Formulário de nova transação
- `src/app/(app)/financeiro/transacoes/[id]/page.tsx` — Edição (server component serializa Decimal)
- `src/app/(app)/financeiro/categorias/page.tsx` — CRUD com Dialog inline
- `src/app/(app)/financeiro/orcamento/page.tsx` — Planejamento mensal com navegação entre meses

### Componentes
- `src/components/financeiro/category-badge.tsx` — Badge com cor da categoria
- `src/components/financeiro/filters-bar.tsx` — Filtros de transações (período, tipo, categoria, pagamento)
- `src/components/financeiro/transaction-form.tsx` — Formulário criar/editar com react-hook-form + zod
- `src/components/financeiro/transaction-list.tsx` — Lista agrupada por data com ações
- `src/components/financeiro/balance-card.tsx` — Cards de saldo/receitas/despesas do mês
- `src/components/financeiro/expense-chart.tsx` — Donut chart Recharts (SSR desativado via dynamic)
- `src/components/financeiro/income-vs-expense.tsx` — Bar chart Recharts (SSR desativado via dynamic)
- `src/components/financeiro/monthly-summary.tsx` — Tabela resumo por categoria
- `src/components/financeiro/budget-progress.tsx` — Barra de progresso com cor dinâmica

## Regras financeiras implementadas

- Saldo = SUM(INCOME) - SUM(EXPENSE) — calculado no banco via Prisma `_sum` (nunca float)
- Decimal → string no JSON da API, decimalToNumber() no frontend
- Ao marcar como pago: `paidAt = new Date()` automático; ao desmarcar: `paidAt = null`
- Excluir categoria verificada contra FK (transactionCount > 0 → 409)
- Excluir transação verificada contra filhos recorrentes (parentId count > 0 → 409)
- Budget usa upsert com `@@unique([month, year])` como chave

## Padrões de serialização

```typescript
// Sempre converter Decimal → string antes do JSON
amount: String(transaction.amount)
budgetAmount: budgetAmount != null ? String(budgetAmount) : null

// Na página server component (edit):
const serialized: Transaction = { ...transaction, amount: String(transaction.amount), ... }
```

## Recharts — SSR desativado

```typescript
// SEMPRE importar dinamicamente, SSR false
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
// Mesmo padrão para: Pie, Cell, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
```

## @base-ui/react Dialog

- Dialog Root aceita `open?: boolean` e `onOpenChange?: (open: boolean, eventDetails) => void`
- Usar `onOpenChange={(open) => setState(open)}` para compatibilidade com estado booleano simples

## Fase 8 — Recorrência para Transações

### API
- `src/app/api/financeiro/recorrentes/route.ts` — GET (?month&year → lista pais + status) + POST ({ transactionId, targetMonth, targetYear } → gera instâncias)

### Hook
- `src/hooks/use-recurring-transactions.ts` — `useRecurringTransactions(month, year)` → parents[], generateForMonth(), refresh()

### Componentes
- `src/components/financeiro/recurrence-selector.tsx` — seleção de frequência + data de encerramento + texto PT-BR legível
- `src/components/financeiro/recurring-section.tsx` — seção colapsável na página de transações, mostra status e botão "Gerar este mês"

### Padrões de recorrência
- Pai: `isRecurring=true`, `recurrenceRule` (ex: "FREQ=MONTHLY"), `parentId=null`
- Instância: `isRecurring=false`, `parentId=<id do pai>`, herda amount/type/categoryId/description
- Regra RRULE armazenada sem prefixo (ex: "FREQ=MONTHLY"); a API adiciona "RRULE:" ao construir
- dtstart = data da transação pai; âncora da recorrência
- Geração atômica com `prisma.$transaction([...creates])`
- Verificação de duplicatas: busca instâncias existentes no período antes de criar
- Exclusão de pai com filhos já bloqueada na [id]/route.ts (retorna 409)

### TransactionForm atualizado
- Seção de recorrência agora usa `RecurrenceSelector` em vez de campos inline

## Fase 9 — Orçamento por Categoria com Progress Bars

### API
- `src/app/api/financeiro/orcamento/categorias/route.ts` — GET (?month&year) → todas as categorias EXPENSE com budgetAmount e spending do mês

### Componente
- `src/components/financeiro/category-budgets.tsx` — seção "Orcamento por categoria": categorias com limite mostram BudgetProgress; categorias sem limite mostram link "Definir limite" → /financeiro/categorias

### Alterações
- `BudgetProgress` — thresholds atualizados: verde < 70%, amarelo 70-89%, vermelho >= 90% (antes era 60/80)
- `orcamento/page.tsx` — importa `CategoryBudgets`, threshold do banner de aviso atualizado para 70%, nova seção adicionada após "Despesas por categoria"

### Notas
- `CategoryBudgets` é client component, busca `/api/financeiro/orcamento/categorias` com month/year
- Categorias com limite são ordenadas por percentage desc (mais críticas primeiro)
- Categorias sem limite usam `buttonVariants` via `@/lib/button-variants` (não asChild)

## Status do build

Build passou com 0 erros TypeScript em 2026-03-29. 34 rotas geradas (Fase 9 incluída).
