const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: "free@naijaclimaguard.com", name: "Free User", password: "demo1234", plan: "FREE" },
    { email: "pro@naijaclimaguard.com", name: "Pro User", password: "demo1234", plan: "PROFESSIONAL" },
    { email: "enterprise@naijaclimaguard.com", name: "Enterprise User", password: "demo1234", plan: "ENTERPRISE" },
    { email: "demo@naijaclimaguard.com", name: "Demo User", password: "demo1234", plan: "PROFESSIONAL" },
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, passwordHash: hash, plan: u.plan },
    });

    if (u.plan !== "FREE") {
      const existing = await prisma.location.count({ where: { userId: user.id } });
      if (existing === 0) {
        const locs = [
          { name: "Lokoja Warehouse", state: "Kogi", latitude: 7.7337, longitude: 6.6906 },
          { name: "Onitsha Branch", state: "Anambra", latitude: 6.1667, longitude: 6.7833 },
          { name: "Lagos HQ", state: "Lagos", latitude: 6.5244, longitude: 3.3792 },
          { name: "Port Harcourt Depot", state: "Rivers", latitude: 4.8156, longitude: 7.0498 },
        ];
        for (const loc of locs) {
          const l = await prisma.location.create({ data: { ...loc, userId: user.id } });
          await prisma.alert.create({
            data: { threshold: 60, channels: '["email","sms"]', userId: user.id, locationId: l.id },
          });
        }
      }
    }
    console.log("Created: " + u.email + " (" + u.plan + ")");
  }
  console.log("\nSeed complete. Password for all: demo1234");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });