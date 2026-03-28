import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { DEFAULT_AGENDA_CATEGORIES, DEFAULT_FINANCE_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Categorias da agenda
  for (const cat of DEFAULT_AGENDA_CATEGORIES) {
    await prisma.agendaCategory.upsert({
      where: { id: `seed-agenda-${cat.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-agenda-${cat.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
      },
    });
  }
  console.log(`${DEFAULT_AGENDA_CATEGORIES.length} categorias de agenda criadas`);

  // Categorias financeiras
  for (const cat of DEFAULT_FINANCE_CATEGORIES) {
    await prisma.financeCategory.upsert({
      where: { id: `seed-finance-${cat.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-finance-${cat.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: cat.name,
        type: cat.type as "INCOME" | "EXPENSE",
        color: cat.color,
        icon: cat.icon,
      },
    });
  }
  console.log(`${DEFAULT_FINANCE_CATEGORIES.length} categorias financeiras criadas`);

  console.log("Seed concluido!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
