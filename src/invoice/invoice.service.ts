import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { AuthenticatedUser } from '@/types/express';
import { InvoiceStatus } from '@prisma/client';
// import { UtilityService } from '@/utils/reference';

import { DiscountStatus } from '@prisma/client';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    // private utilityService: UtilityService,
  ) {}

  async getInvoiceAssignments(
    invoiceId: string,
    user: AuthenticatedUser,
  ): Promise<any[]> {
    const schoolId = user.schoolId;
    // Fetch all student assignments for this invoice, including student info
    const assignments = await this.prisma.studentInvoiceAssignment.findMany({
      where: { invoiceId, schoolId },
      include: {
        student: {
          include: {
            user: true, // To get student name, email, etc.
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return assignments;
  }

  async generateInvoice(
    body: InvoiceDto,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    const {
      type,
      studentId,
      amount,
      classId,
      classIds,
      description,
      title,
      classArmId,
      classArmIds,
      termId,
      sessionId,
    } = body;
    try {
      // Step 1: Create the invoice (template/master)
      // Generate a real-life invoice reference: e.g. INV/2024/06/07/0001
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');

      // Fetch the latest invoice for today to increment the serial
      const latestInvoice = await this.prisma.invoice.findFirst({
        where: {
          createdAt: {
            gte: new Date(`${year}-${month}-${day}T00:00:00.000Z`),
            lt: new Date(
              `${year}-${month}-${(Number(day) + 1).toString().padStart(2, '0')}T00:00:00.000Z`,
            ),
          },
          schoolId,
        },
        orderBy: { reference: 'desc' },
      });

      let serial = 1;
      if (latestInvoice && latestInvoice.reference) {
        const parts = latestInvoice.reference.split('/');
        const lastSerial = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSerial)) {
          serial = lastSerial + 1;
        }
      }
      const serialStr = serial.toString().padStart(4, '0');
      const reference = `INV/${year}/${month}/${day}/${serialStr}`;

      const invoice = await this.prisma.invoice.create({
        data: {
          amount,
          description,
          title,
          class: classId ? { connect: { id: classId } } : undefined,
          classArm: classArmId ? { connect: { id: classArmId } } : undefined,
          school: { connect: { id: schoolId } },
          reference,
          type: type || 'single', // Default to single if not provided
          term: { connect: { id: termId } },
          session: { connect: { id: sessionId } },
          createdByUser: { connect: { id: user.id } },
        },
      });

      let studentAssignments = [];
      if (type === 'mass') {
        // Fetch students for the given session, classes, and arms
        const assignmentWhere: any = {
          sessionId,
          classId: { in: classIds },
          schoolId,
          isActive: true,
        };
        if (classArmIds && classArmIds.length > 0) {
          assignmentWhere.classArmId = { in: classArmIds };
        }
        const assignments = await this.prisma.studentClassAssignment.findMany({
          where: assignmentWhere,
          select: { studentId: true },
        });
        if (!assignments.length) {
          throw new HttpException(
            'No students found for the selected classes/arms/session',
            400,
          );
        }
        // Create StudentInvoiceAssignment for each student
        studentAssignments = await this.prisma.$transaction(
          assignments.map((assignment) =>
            this.prisma.studentInvoiceAssignment.create({
              data: {
                invoice: { connect: { id: invoice.id } },
                student: { connect: { id: assignment.studentId } },
                school: { connect: { id: schoolId } },
                outstanding: amount,
                status: 'submitted',
              },
            }),
          ),
        );
      } else {
        // Single student assignment
        if (!studentId) {
          throw new HttpException(
            'studentId is required for single invoice',
            400,
          );
        }
        const assignment = await this.prisma.studentInvoiceAssignment.create({
          data: {
            invoice: { connect: { id: invoice.id } },
            student: { connect: { id: studentId } },
            school: { connect: { id: schoolId } },
            outstanding: amount,
            status: 'submitted',
          },
        });
        studentAssignments = [assignment];
      }
      return {
        message: `Invoice created and assigned to ${studentAssignments.length} student(s)`,
        invoice,
        studentAssignments,
      };
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

  async getInvoiceByReference(
    reference: string,
    user: AuthenticatedUser,
  ): Promise<any> {
    console.log(reference);
    const schoolId = user.schoolId;
    const invoice = await this.prisma.invoice.findFirst({
      where: { reference, schoolId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async deleteInvoice(
    invoiceId: string,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    // Soft delete: set status to 'cancelled' and optionally set isDeleted flag if you have one
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId, schoolId },
      data: { isDeleted: true },
    });
    return { message: 'Invoice cancelled', invoice };
  }

  async allSchoolInvoice({
    user,
    classId,
    termId,
    sessionId,
    classArmId,
    search,
    page,
    limit,
    skip,
  }: {
    user: AuthenticatedUser;
    classId?: string;
    termId?: string;
    sessionId?: string;
    classArmId?: string;
    search?: string;
    page: number;
    limit: number;
    skip: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const schoolId = user.schoolId;

    try {
      // Build the where clause dynamically
      const where: any = { schoolId };

      // Add filters based on query parameters
      if (classId) {
        where.classId = classId;
      }
      if (termId) {
        where.termId = termId;
      }
      if (sessionId) {
        where.sessionId = sessionId;
      }
      if (classArmId) {
        where.classArmId = classArmId;
      }
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
          {
            student: {
              firstName: { contains: search },
            },
          },
          {
            student: {
              lastName: { contains: search },
            },
          },
        ];
      }

      // Fetch paginated invoices
      const [invoices, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          include: {
            class: true,
            classArm: true,
            term: true,
            session: true,
            createdByUser: {
              select: { id: true, lastname: true, firstname: true },
            }, // Include user info for createdBy
            studentInvoiceAssignments: {
              include: {
                student: {
                  include: {
                    user: true, // Include user info for student
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.invoice.count({ where }),
      ]);

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      return {
        data: invoices,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch invoices', 500);
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
  async getStudentInvoiceAssignment(
    assignmentId: string,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    return this.prisma.studentInvoiceAssignment.findUnique({
      where: { id: assignmentId, schoolId },
      include: {
        student: { include: { user: true } },
        invoice: true,
      },
    });
  }

  async updateStudentInvoiceAssignment(
    assignmentId: string,
    data: Partial<{ status: InvoiceStatus; paid: number; outstanding: number }>,
    user: AuthenticatedUser,
  ): Promise<any> {
    const schoolId = user.schoolId;
    const assignment = await this.prisma.studentInvoiceAssignment.update({
      where: { id: assignmentId, schoolId },
      data,
    });
    return assignment;
  }

  async getStudentAssignments(
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<any[]> {
    const schoolId = user.schoolId;
    return this.prisma.studentInvoiceAssignment.findMany({
      where: { studentId, schoolId },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- DISCOUNT SYSTEM ---

  /**
   * Create a discount for an invoice (can be mass or single)
   * Applies discount to all student assignments for the invoice
   */
  async createDiscount(
    data: {
      invoiceId: string;
      amount: number;
      // description?: string;
      dueDate?: Date;
    },
    user: AuthenticatedUser,
  ) {
    const schoolId = user.schoolId;
    // Create discount
    const discount = await this.prisma.discount.create({
      data: {
        invoice: { connect: { id: data.invoiceId } },
        amount: data.amount,
        // description: data.description,
        dueDate: data.dueDate,
        status: DiscountStatus.pending,
        school: { connect: { id: schoolId } },
        createdByUser: { connect: { id: user.id } },
      },
    });
    return discount;
  }

  /**
   * Cron job: Auto-expire discounts whose dueDate has passed and revert outstanding for affected assignments
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoExpireDiscounts() {
    const now = new Date();
    // Find all active discounts with dueDate in the past
    const expiredDiscounts = await this.prisma.discount.findMany({
      where: {
        status: DiscountStatus.approved,
        dueDate: { lte: now },
      },
    });
    for (const discount of expiredDiscounts) {
      // Mark as expired
      await this.prisma.discount.update({
        where: { id: discount.id },
        data: { status: DiscountStatus.expired },
      });
      // Revert outstanding for unpaid assignments
      await this.revertDiscountFromAssignments(
        discount.invoiceId,
        discount.amount,
        discount.schoolId,
      );
    }
  }

  /**
   * List all discounts for an invoice
   */
  async listDiscounts(invoiceId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    return this.prisma.discount.findMany({
      where: { invoiceId, schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single discount by id
   */
  async getDiscount(discountId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    return this.prisma.discount.findUnique({
      where: { id: discountId, schoolId },
    });
  }

  /**
   * Update a discount (only if pending)
   */
  async updateDiscount(
    discountId: string,
    data: Partial<{ amount: number; description: string; dueDate: Date }>,
    user: AuthenticatedUser,
  ) {
    const schoolId = user.schoolId;
    // Only allow update if status is pending
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId, schoolId },
    });
    if (!discount || discount.status !== 'pending') {
      throw new HttpException('Discount not found or not editable', 400);
    }
    return this.prisma.discount.update({
      where: { id: discountId, schoolId },
      data,
    });
  }

  /**
   * Approve a discount (makes it active and applies to all assignments)
   */
  async approveDiscount(discountId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    const discount = await this.prisma.discount.update({
      where: { id: discountId, schoolId },
      data: {
        status: DiscountStatus.approved,
        approvedBy: { connect: { id: user.id } },
        approvedAt: new Date(),
      },
    });
    // Apply discount to all assignments for the invoice
    await this.applyDiscountToAssignments(
      discount.invoiceId,
      discount.amount,
      schoolId,
    );
    return discount;
  }

  /**
   * Expire a discount (manually or via scheduled job)
   * Reverts outstanding for unpaid assignments
   */
  async expireDiscount(discountId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    const discount = await this.prisma.discount.update({
      where: { id: discountId, schoolId },
      data: {
        status: DiscountStatus.expired,
      },
    });
    // Revert outstanding for unpaid assignments
    await this.revertDiscountFromAssignments(
      discount.invoiceId,
      discount.amount,
      schoolId,
    );
    return discount;
  }

  /**
   * Apply discount to all assignments for an invoice (reduce outstanding if not fully paid)
   */
  private async applyDiscountToAssignments(
    invoiceId: string,
    amount: number,
    schoolId: string,
  ) {
    const assignments = await this.prisma.studentInvoiceAssignment.findMany({
      where: { invoiceId, schoolId },
    });
    const updates = assignments
      .map((a) => {
        // Only apply to assignments with outstanding > 0
        if (a.outstanding > 0) {
          const newOutstanding = Math.max(a.outstanding - amount, 0);
          return this.prisma.studentInvoiceAssignment.update({
            where: { id: a.id },
            data: { outstanding: newOutstanding },
          });
        }
        return null;
      })
      .filter(Boolean);
    await this.prisma.$transaction(updates);
  }

  /**
   * Revert discount from all assignments for an invoice (increase outstanding if not fully paid)
   */
  private async revertDiscountFromAssignments(
    invoiceId: string,
    amount: number,
    schoolId: string,
  ) {
    const assignments = await this.prisma.studentInvoiceAssignment.findMany({
      where: { invoiceId, schoolId },
    });
    const updates = assignments
      .map((a) => {
        // Only revert for assignments with outstanding < invoice amount
        // (Assumes invoice amount is stored on assignment or fetched)
        // For simplicity, just add back the discount if not fully paid
        if (a.outstanding > 0) {
          return this.prisma.studentInvoiceAssignment.update({
            where: { id: a.id },
            data: { outstanding: a.outstanding + amount },
          });
        }
        return null;
      })
      .filter(Boolean);
    await this.prisma.$transaction(updates);
  }
}
