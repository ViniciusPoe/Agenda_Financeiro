import "dotenv/config";
import { createConnection } from "mariadb";

async function main() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const conn = await createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
  });

  console.log("Conectado ao banco. Criando tabelas...\n");

  const statements = [
    {
      name: "sessions",
      sql: `CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`token\` VARCHAR(255) NOT NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`sessions_token_key\`(\`token\`),
        INDEX \`sessions_token_idx\`(\`token\`),
        INDEX \`sessions_expiresAt_idx\`(\`expiresAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    },
    {
      name: "agenda_categories",
      sql: `CREATE TABLE IF NOT EXISTS \`agenda_categories\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`color\` VARCHAR(7) NOT NULL,
        \`icon\` VARCHAR(50) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    },
    {
      name: "finance_categories",
      sql: `CREATE TABLE IF NOT EXISTS \`finance_categories\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`type\` ENUM('INCOME', 'EXPENSE') NOT NULL,
        \`color\` VARCHAR(7) NOT NULL,
        \`icon\` VARCHAR(50) NULL,
        \`budgetAmount\` DECIMAL(12, 2) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    },
    {
      name: "transactions",
      sql: `CREATE TABLE IF NOT EXISTS \`transactions\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`description\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(12, 2) NOT NULL,
        \`type\` ENUM('INCOME', 'EXPENSE') NOT NULL,
        \`date\` DATE NOT NULL,
        \`notes\` TEXT NULL,
        \`categoryId\` VARCHAR(191) NOT NULL,
        \`isRecurring\` BOOLEAN NOT NULL DEFAULT false,
        \`recurrenceRule\` VARCHAR(500) NULL,
        \`recurrenceEnd\` DATE NULL,
        \`parentId\` VARCHAR(191) NULL,
        \`paid\` BOOLEAN NOT NULL DEFAULT false,
        \`paidAt\` DATETIME(3) NULL,
        \`dueDate\` DATE NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`transactions_date_idx\`(\`date\`),
        INDEX \`transactions_type_idx\`(\`type\`),
        INDEX \`transactions_categoryId_idx\`(\`categoryId\`),
        INDEX \`transactions_paid_idx\`(\`paid\`),
        INDEX \`transactions_dueDate_idx\`(\`dueDate\`),
        INDEX \`transactions_date_type_idx\`(\`date\`, \`type\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    },
    {
      name: "agenda_events",
      sql: `CREATE TABLE IF NOT EXISTS \`agenda_events\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`date\` DATE NOT NULL,
        \`startTime\` VARCHAR(5) NULL,
        \`endTime\` VARCHAR(5) NULL,
        \`allDay\` BOOLEAN NOT NULL DEFAULT false,
        \`priority\` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
        \`status\` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        \`categoryId\` VARCHAR(191) NULL,
        \`transactionId\` VARCHAR(191) NULL,
        \`recurrenceRule\` VARCHAR(500) NULL,
        \`recurrenceEnd\` DATE NULL,
        \`parentEventId\` VARCHAR(191) NULL,
        \`reminderMinutes\` INTEGER NULL,
        \`completedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`agenda_events_transactionId_key\`(\`transactionId\`),
        INDEX \`agenda_events_date_idx\`(\`date\`),
        INDEX \`agenda_events_status_idx\`(\`status\`),
        INDEX \`agenda_events_priority_idx\`(\`priority\`),
        INDEX \`agenda_events_categoryId_idx\`(\`categoryId\`),
        INDEX \`agenda_events_date_status_idx\`(\`date\`, \`status\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    },
    {
      name: "budgets",
      sql: `CREATE TABLE IF NOT EXISTS \`budgets\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`month\` SMALLINT NOT NULL,
        \`year\` SMALLINT NOT NULL,
        \`totalLimit\` DECIMAL(12, 2) NOT NULL,
        \`notes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`budgets_month_year_key\`(\`month\`, \`year\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    },
  ];

  for (const { name, sql } of statements) {
    try {
      await conn.query(sql);
      console.log(`  ✓ Tabela '${name}' OK`);
    } catch (e) {
      console.error(`  ✗ Erro em '${name}':`, e.message);
    }
  }

  // Foreign keys - each one individually
  console.log("\nAdicionando foreign keys...");
  const fks = [
    {
      name: "agenda_events_categoryId_fkey",
      sql: "ALTER TABLE `agenda_events` ADD CONSTRAINT `agenda_events_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `agenda_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    },
    {
      name: "agenda_events_transactionId_fkey",
      sql: "ALTER TABLE `agenda_events` ADD CONSTRAINT `agenda_events_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    },
    {
      name: "agenda_events_parentEventId_fkey",
      sql: "ALTER TABLE `agenda_events` ADD CONSTRAINT `agenda_events_parentEventId_fkey` FOREIGN KEY (`parentEventId`) REFERENCES `agenda_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
    },
    {
      name: "transactions_categoryId_fkey",
      sql: "ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `finance_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE",
    },
    {
      name: "transactions_parentId_fkey",
      sql: "ALTER TABLE `transactions` ADD CONSTRAINT `transactions_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
    },
  ];

  for (const { name, sql } of fks) {
    try {
      await conn.query(sql);
      console.log(`  ✓ FK '${name}' adicionada`);
    } catch (e) {
      if (e.errno === 1061 || e.errno === 1826 || String(e.message).includes("Duplicate key")) {
        console.log(`  ~ FK '${name}' ja existia`);
      } else {
        console.error(`  ✗ Erro FK '${name}':`, e.message);
      }
    }
  }

  await conn.end();
  console.log("\n✅ Concluido! Suas tabelas existentes nao foram afetadas.");
}

main().catch(e => { console.error(e); process.exit(1); });
