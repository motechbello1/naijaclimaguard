const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEMOS = [
  { email: "free@naijaclimaguard.com", name: "Free Demo", plan: "FREE", passwordEnv: "NCG_DEMO_FREE_PASSWORD" },
  { email: "pro@naijaclimaguard.com", name: "Professional Demo", plan: "PROFESSIONAL", passwordEnv: "NCG_DEMO_PRO_PASSWORD" },
  { email: "enterprise@naijaclimaguard.com", name: "Enterprise Demo", plan: "ENTERPRISE", passwordEnv: "NCG_DEMO_ENTERPRISE_PASSWORD" },
];

function requiredPassword(envName) {
  const value = process.env[envName];
  if (!value || value.length < 16) {
    throw new Error(`${envName} must be set to a private password of at least 16 characters.`);
  }
  return value;
}

async function main() {
  if (process.env.NCG_ENABLE_DEMO_SEED !== "true") {
    console.log("Demo seed skipped. Set NCG_ENABLE_DEMO_SEED=true and private per-role passwords to create demo accounts.");
    return;
  }

  for (const spec of DEMOS) {
    const password = requiredPassword(spec.passwordEnv);
    const hash = bcrypt.hashSync(password, 12);
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { name: spec.name, plan: spec.plan, passwordHash: hash },
      create: { email: spec.email, name: spec.name, passwordHash: hash, plan: spec.plan },
    });

    if (spec.plan !== "FREE") {
      const existing = await prisma.location.count({ where: { userId: user.id } });
      if (existing === 0) {
        const locs = [
          { name: "Lokoja Warehouse", state: "Kogi", latitude: 7.7337, longitude: 6.6906 },
          { name: "Onitsha Branch", state: "Anambra", latitude: 6.1667, longitude: 6.7833 },
          { name: "Lagos HQ", state: "Lagos", latitude: 6.5244, longitude: 3.3792 },
          { name: "Port Harcourt Depot", state: "Rivers", latitude: 4.8156, longitude: 7.0498 },
        ];
        for (const loc of locs) {
          const location = await prisma.location.create({ data: { ...loc, userId: user.id } });
          await prisma.alert.create({
            data: { threshold: 60, channels: '["EMAIL"]', userId: user.id, locationId: location.id },
          });
        }
      }
    }
    console.log(`Prepared private demo account: ${spec.email} (${spec.plan})`);
  }

  console.log("Demo seed complete. Passwords were read from environment variables and are not printed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
