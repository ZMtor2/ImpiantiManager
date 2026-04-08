import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@impiantimanager.it" },
    update: {},
    create: {
      nome: "Admin",
      cognome: "Sistema",
      email: "admin@impiantimanager.it",
      passwordHash,
      ruolo: "ADMIN",
      attivo: true,
    },
  });
  console.log("Admin user:", admin.email);

  // Create sample compagnie
  const compagnie = [
    { nome: "Eni/IP" },
    { nome: "Esso" },
    { nome: "Q8" },
    { nome: "Shell" },
    { nome: "TotalEnergies" },
    { nome: "Ego" },
  ];

  for (const c of compagnie) {
    await prisma.compagnia.upsert({
      where: { nome: c.nome },
      update: {},
      create: c,
    });
  }
  console.log("Compagnie seeded:", compagnie.length);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
