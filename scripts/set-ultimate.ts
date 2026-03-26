import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'karrarmayaly@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} not found. Please sign in first.`);
    return;
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: 'ultimate',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    },
    create: {
      userId: user.id,
      plan: 'ultimate',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  console.log(`✅ Set ${email} as Ultimate subscriber!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
