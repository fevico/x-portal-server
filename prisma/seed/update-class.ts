import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateClassCategories() {
  const classes = await prisma.class.findMany();
  for (const classItem of classes) {
    if (classItem.name.startsWith('SS')) {
      await prisma.class.update({
        where: { id: classItem.id },
        data: { category: 'senior' },
      });
    } else {
      await prisma.class.update({
        where: { id: classItem.id },
        data: { category: 'junior' },
      });
    }
  }
  console.log('Class categories updated.');
}

updateClassCategories()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
