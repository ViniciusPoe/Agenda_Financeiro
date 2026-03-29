# Guia de Configuracao e Deploy

## 1. Configurar o banco de dados

Edite o arquivo `.env` com os dados reais do MySQL na AWS:

```env
DATABASE_URL="mysql://USUARIO:SENHA@ENDPOINT.rds.amazonaws.com:3306/NOME_DO_BANCO"
AUTH_PASSWORD="escolha_uma_senha_forte_aqui"
AUTH_SALT_ROUNDS="12"
SESSION_EXPIRY_DAYS="7"
SESSION_SECRET="cole_aqui_uma_string_aleatoria_de_64_chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Para gerar um `SESSION_SECRET`, execute:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Criar as tabelas no banco

> **Atencao:** O banco MySQL e compartilhado com outro projeto. NUNCA use `prisma migrate dev`
> ou `prisma db push` porque eles podem tentar alterar tabelas fora deste app.

Fluxo seguro para criar novas tabelas:

```bash
# 1. Gerar o SQL das tabelas (sem aplicar nada no banco)
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script

# 2. Copie do output apenas os blocos CREATE TABLE das tabelas novas
#    e salve em um arquivo, por exemplo migration.sql

# 3. Revise o SQL e execute no banco
npx prisma db execute --file migration.sql --schema prisma/schema.prisma

# 4. Regenere o client TypeScript
npx prisma generate
```

Para apenas regenerar o client sem alterar o banco:

```bash
npm run db:generate
```

## 3. Popular categorias padrao

```bash
npm run db:seed
```

## 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 5. Deploy na Vercel

### Configurar Security Group da AWS

O MySQL na AWS precisa aceitar conexoes dos IPs da Vercel.
Opcao recomendada: no Security Group do RDS, adicione uma regra de entrada:

- Tipo: `MySQL/Aurora`
- Porta: `3306`
- Origem: `0.0.0.0/0` ou os IPs especificos da Vercel

### Fazer deploy

1. Instale a Vercel CLI: `npm install -g vercel`
2. Execute: `vercel`
3. Siga as instrucoes para conectar ao projeto

### Configurar variaveis de ambiente na Vercel

No dashboard da Vercel:

`Settings > Environment Variables`

Adicione:

- `DATABASE_URL`
- `AUTH_PASSWORD`
- `AUTH_SALT_ROUNDS`
- `SESSION_EXPIRY_DAYS`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Executar migrations na producao

Apos o deploy, execute localmente com as variaveis de producao:

```bash
DATABASE_URL="mysql://..." npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
DATABASE_URL="mysql://..." npx prisma db execute --file migration.sql --schema prisma/schema.prisma
DATABASE_URL="mysql://..." npm run db:seed
```

---

## Estrutura do Banco de Dados

Tabelas criadas:

- `sessions` - sessoes de autenticacao
- `agenda_categories` - categorias de eventos
- `agenda_events` - eventos, tarefas e compromissos
- `finance_categories` - categorias financeiras
- `transactions` - lancamentos financeiros
- `budgets` - orcamentos mensais
