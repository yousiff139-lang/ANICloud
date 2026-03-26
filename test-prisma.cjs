const { PrismaClient } = require('@prisma/client');
try {
  console.log('Attempting to instantiate PrismaClient...');
  const prisma = new PrismaClient();
  console.log('PrismaClient instantiated successfully');
} catch (e) {
  console.error('Error instantiating PrismaClient:', e.message);
  console.error(e.stack);
}
