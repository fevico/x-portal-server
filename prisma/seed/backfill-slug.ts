import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillSlugs() {
  try {
    // Fetch the existing school
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('No school found.');
      return;
    }

    // Generate a slug for the school (e.g., based on name)
    const slug = school.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Update the school with the slug
    await prisma.school.update({
      where: { id: school.id },
      data: { slug },
    });

    console.log(
      `Successfully updated school and configuration with slug: ${slug}`,
    );
  } catch (error) {
    console.error('Error backfilling slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillSlugs();
