import { InvoiceStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillSlugs() {
  try {
    // Fetch the existing student invoice assignment
    const studentInvoiceAssignment = await prisma.studentInvoiceAssignment.findFirst();
    if (!studentInvoiceAssignment) {
      console.log('No student invoice assignment found.');
      return;
    }

  const status = InvoiceStatus.unpaid; // Set the status to unpaid
    // Update the student invoice assignment with the status
    await prisma.studentInvoiceAssignment.update({
      where: { id: studentInvoiceAssignment.id },
      data: { status },
    });

    console.log(
      `Successfully updated student invoice assignment with status: ${status}`,
    );
  } catch (error) {
    console.error('Error backfilling slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillSlugs();
