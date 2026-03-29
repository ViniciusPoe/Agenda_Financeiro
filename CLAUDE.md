# Agenda + Controle Financeiro — Guia para Agentes

## Stack

- **Framework**: Next.js 16+ (App Router) com TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui (usa @base-ui/react — SEM `asChild`!)
- **ORM**: Prisma 7 com `@prisma/adapter-mariadb` (MySQL/MariaDB na AWS)
- **Auth**: Sessao simples com bcrypt + cookie HTTP-only
- **Deploy**: Vercel (frontend) + MySQL AWS (banco)

## REGRAS CRITICAS

### shadcn/ui - Tailwind v4
- **NUNCA use `asChild`** - nao existe no @base-ui/react
- Links com estilo de botao: `import { buttonVariants } from "@/lib/button-variants"` + `<Link className={cn(buttonVariants({ variant: "ghost" }))}>`
- `DropdownMenuTrigger`: use `className={cn(buttonVariants(...))}` diretamente

### Prisma 7
- Import sempre de `@/generated/prisma/client` (nao de `@/generated/prisma`)
- A conexao usa `@prisma/adapter-mariadb` via string (veja `src/lib/prisma.ts`)
- Schema em `prisma/schema.prisma` - datasource SEM url (fica no `prisma.config.ts`)
- Migrations: `npx prisma migrate dev` (requer DATABASE_URL no ambiente)

### Valores Monetarios
- **NUNCA use float** - use Decimal(12,2) no banco
- Converta Decimal para string na API: `String(value)`
- Use `decimalToNumber()` de `@/lib/utils` para number no frontend
- Use `formatCurrency()` para exibir em BRL

### Recharts (graficos)
- **SEMPRE importe dinamicamente**: `dynamic(() => import('recharts').then(...), { ssr: false })`
- Nao importe recharts diretamente em server components

### Proxy (Middleware)
- Arquivo: `src/proxy.ts` (nao middleware.ts - renomeado para Next.js 16)
- Funcao exportada: `export async function proxy(...)`

## Estrutura de Pastas

```
src/
  app/
    (app)/          # Paginas autenticadas (usa layout com Sidebar/Header)
    api/            # API routes
    login/          # Pagina publica de login
  components/
    agenda/         # Componentes do modulo de agenda
    financeiro/     # Componentes do modulo financeiro
    layout/         # Sidebar, Header, MobileNav, PageContainer
    shared/         # EmptyState, ConfirmDialog, StatsCard, LoadingSkeleton
    ui/             # shadcn/ui (nao editar manualmente)
  generated/
    prisma/         # Cliente Prisma gerado (nao editar)
  lib/
    prisma.ts       # Singleton Prisma com adapter
    auth.ts         # Funcoes de autenticacao
    utils.ts        # cn(), formatCurrency(), formatDate(), isOverdue()
    validators.ts   # Schemas Zod
    constants.ts    # Labels, cores, categorias padrao
    button-variants.ts  # buttonVariants para server components
  hooks/            # React hooks customizados
  types/            # Tipos TypeScript (agenda.ts, financeiro.ts)
```

## Comandos Uteis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de producao (testa TypeScript)
npm run db:generate  # Gerar cliente Prisma
npm run db:migrate   # Aplicar migrations
npm run db:seed      # Popular categorias padrao
npm run db:studio    # Prisma Studio
```

## Variaveis de Ambiente (.env)

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
AUTH_PASSWORD="senha_do_sistema"
AUTH_SALT_ROUNDS="12"
SESSION_EXPIRY_DAYS="7"
SESSION_SECRET="string_aleatoria_longa"
NEXT_PUBLIC_APP_URL="https://seu-dominio.vercel.app"
```

## Agentes Especializados

- `schedule-module-architect`: modulo de agenda (eventos, calendario, recorrencia)
- `financial-control-module`: modulo financeiro (transacoes, saldo, orcamento)
- Agente principal: fundacao, layout, autenticacao, integracao, deploy
