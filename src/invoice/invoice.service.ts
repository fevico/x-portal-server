import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { AuthenticatedUser } from '@/types/express';
// import { UtilityService } from '@/utils/reference';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    // private utilityService: UtilityService,
  ) {}

  async generateInvoice(
    body: InvoiceDto,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    const { studentId, amount, classId, description, title, classArmId } = body;
    // const reference = await this.utilityService.generateUniqueReferenceNumber(); // Use unique reference
    try {
      const createInvoice = await this.prisma.invoice.create({
        data: {
          amount,
          description,
          title,
          student: studentId ? { connect: { id: studentId } } : undefined, // Optional relation
          class: { connect: { id: classId } },
          classArm: { connect: { id: classArmId } },
          school: { connect: { id: schoolId } },
          issuedDate: new Date(),
          reference: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Simple unique reference generation
        },
      });
      return createInvoice;
    } catch (error) {
      throw new HttpException('Failed to generate invoice', 500);
    }
  }

  async getInvoiceById(id: string, user: AuthenticatedUser): Promise<any> {
    try {
      console.log(user);
      const invoice = await this.prisma.invoice.findUnique({
        where: { id },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      return invoice;
    } catch (error) {
      throw new HttpException(`Error fetching invoice with ${id}`, 500);
    }
  }

  async allSchoolInvoice(user: AuthenticatedUser): Promise<any> {
    const schoolId = user.schoolId;
    try {
      const invoice = await this.prisma.invoice.findMany({
        where: { schoolId },
        include: {
          student: true,
          class: true,
          classArm: true,
        },
        orderBy: {
          issuedDate: 'desc',
        },
      });
      return invoice;
    } catch (error) {
      throw new HttpException('Failed to fetch invoice', 500);
    }
  }

  async updateDiscountInvoice(
    invoiceId: string,
    body: any,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    const { discount, dueDate } = body;
    try {
      const updatedInvoice = await this.prisma.invoice.update({
        where: { id: invoiceId, schoolId },
        data: {
          discount,
          dueDate: dueDate ? new Date(dueDate) : null, // Ensure dueDate is a Date object
        },
      });
      if (!updatedInvoice) {
        throw new NotFoundException('Invoice not found for this school');
      }
      return updatedInvoice;
    } catch (error) {
      throw new HttpException('Failed to update invoice', 500);
    }
  }

  async updateInvoice(
    invoiceId: string,
    body: UpdateInvoiceDto,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    const { amount, description, title } = body;
    try {
      const updatedInvoice = await this.prisma.invoice.update({
        where: { id: invoiceId, schoolId },
        data: {
          amount,
          description,
          title,
        },
      });
      if (!updatedInvoice) {
        throw new NotFoundException('Invoice not found for this school');
      }
      return updatedInvoice;
    } catch (error) {
      throw new HttpException('Failed to update invoice', 500);
    }
  }
}
