const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const posts = await prisma.communityPost.findMany({
      take: 20,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, profile: { select: { avatar: true } } }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    });
    console.log("Success:", posts);
  } catch (error) {
    console.error("Prisma Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
