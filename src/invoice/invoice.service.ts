import { PrismaService } from '@/prisma/prisma.service';
import {
  HttpException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { DiscountStatus, InvoiceStatus } from '@prisma/client';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async getInvoiceAssignments(
    invoiceId: string,
    status: string | undefined,
    user: AuthenticatedUser,
  ): Promise<any[]> {
    const schoolId = user.schoolId;

    // Build base where clause
    const where: any = { invoiceId, schoolId };

    // Handle status filtering
    if (status) {
      // Split by comma if multiple statuses are provided
      const statusArray = status.split(',').map((s) => s.trim().toLowerCase());

      // Validate that all provided statuses are valid InvoiceStatus values
      const validStatuses = statusArray.filter((s) =>
        ['paid', 'unpaid', 'partial'].includes(s),
      ) as InvoiceStatus[];

      if (validStatuses.length > 0) {
        where.status = {
          in: validStatuses,
        };
      }
    }

    // Fetch all student assignments for this invoice, including student info
    const assignments = await this.prisma.studentInvoiceAssignment.findMany({
      where,
      include: {
        student: {
          include: {
            user: true, // To get student name, email, etc.
          },
        },
        invoice: true, // Include invoice details
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
      invoiceType,
      studentId,
      amount,
      classIds,
      description,
      title,
      classArmId,
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

      // Create base invoice
      const invoice = await this.prisma.invoice.create({
        data: {
          amount,
          description,
          title,
          classArm:
            invoiceType === 'single' && classArmId
              ? { connect: { id: classArmId } }
              : undefined,
          school: { connect: { id: schoolId } },
          reference,
          invoiceType: invoiceType || 'single',
          term: { connect: { id: termId } },
          session: { connect: { id: sessionId } },
          createdByUser: { connect: { id: user.id } },
          // Create InvoiceClassAssignment records for all classIds
          classes: {
            create: classIds.map((classId) => ({
              classId,
              schoolId,
            })),
          },
        },
        include: {
          classes: true,
        },
      });

      // Validate inputs based on type
      if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
        throw new HttpException(
          'classIds is required and must be an array',
          400,
        );
      }

      if (invoiceType === 'single') {
        if (classIds.length > 1) {
          throw new HttpException(
            'Single invoice can only have one classId',
            400,
          );
        }
        if (!classArmId) {
          throw new HttpException(
            'classArmId is required for single invoice',
            400,
          );
        }
        if (!studentId) {
          throw new HttpException(
            'studentId is required for single invoice',
            400,
          );
        }
      }

      let studentAssignments = [];
      if (invoiceType === 'mass') {
        // Fetch students for the given session and classes
        const assignmentWhere: any = {
          sessionId,
          classId: { in: classIds },
          schoolId,
          isActive: true,
        };
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
                status: InvoiceStatus.unpaid, // Set initial status to unpaid
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
            status: InvoiceStatus.unpaid,
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
      include: {
        createdByUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        studentInvoiceAssignments: {
          include: {
            student: {
              include: {
                user: true, // Get student details
              },
            },
          },
        },
        classes: {
          include: {
            class: true, // Get class details for each assignment
          },
        },
        classArm: true, // Include class arm for single invoices
        term: true,
        session: true,
      },
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
            classes: { include: { class: true } },
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

  async getStudentWithInvoiceAssignments({
    user,
    classId,
    termId,
    sessionId,
    classArmId,
    search,
    page,
    limit,
    skip,
    status,
  }: {
    user: AuthenticatedUser;
    classId?: string;
    termId?: string;
    sessionId?: string;
    classArmId?: string;
    search?: string;
    status?: InvoiceStatus;
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
    console.log(status, 'status');

    // Build where conditions
    const where: any = {
      schoolId,
    };

    if (status) {
      where.status = status;
    }
    // Add session and term filters to invoice relation
    if (sessionId || termId || classId || classArmId) {
      where.invoice = {
        AND: [
          sessionId ? { sessionId } : {},
          termId ? { termId } : {},
          classArmId ? { classArmId } : {},
          classId
            ? {
                classes: {
                  some: {
                    classId: classId,
                  },
                },
              }
            : {},
        ],
      };
    }

    // Add class and arm filters to student relation
    // if (classId || classArmId) {
    //   where.student = {
    //     AND: [classId ? { classId } : {}, classArmId ? { classArmId } : {}],
    //   };
    // }

    // Add search filter for student name
    if (search) {
      where.student = {
        ...where.student,
        user: {
          OR: [
            { firstname: { contains: search } },
            { lastname: { contains: search } },
            {
              AND: [
                { firstname: { contains: search.split(' ')[0] || '' } },
                { lastname: { contains: search.split(' ')[1] || '' } },
              ],
            },
            {
              // Match full name (case-insensitive, partial)
              OR: [
                {
                  // Concatenate firstname + ' ' + lastname and check if contains search
                  // This requires Prisma raw filter, so fallback to separate fields
                  firstname: { contains: search.split(' ')[0] || '' },
                  lastname: { contains: search.split(' ')[1] || '' },
                },
              ],
            },
          ],
        },
      };
    }

    // Get total count for pagination
    const total = await this.prisma.studentInvoiceAssignment.count({
      where,
    });

    // Get paginated data with relations
    const assignments = await this.prisma.studentInvoiceAssignment.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
            class: true,
            classArm: true,
          },
        },
        invoice: {
          include: {
            discounts: {
              where: {
                status: 'approved' as DiscountStatus,
              },
            },
            session: true,
            term: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      data: assignments,
      total,
      page,
      limit,
      totalPages,
    };
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
   * List all discounts for a school
   */
  async listAllDiscounts(user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    return this.prisma.discount.findMany({
      where: { schoolId },
      include: {
        invoice: {
          select: {
            title: true,
            reference: true,
            amount: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all discounts for an invoice
   */
  async listDiscountsByInvoice(invoiceId: string, user: AuthenticatedUser) {
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
  async recordOfflinePayment({
    studentId,
    invoiceId,
    amount,
    proofOfPayment,
    user,
  }: {
    studentId: string;
    invoiceId: string;
    amount: number;
    proofOfPayment?: Express.Multer.File;
    user: AuthenticatedUser;
  }) {
    const schoolId = user.schoolId;

    // Validate that invoice exists and belongs to this school
    const invoice = await this.prisma.studentInvoiceAssignment.findFirst({
      where: {
        invoice: { id: invoiceId },
        student: { id: studentId },
        schoolId,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found for this student');
    }

    // Upload image to Cloudinary
    let imageUrl: string | undefined;
    let pubId: string | undefined;

    try {
      if (proofOfPayment) {
        // Use the reusable Cloudinary upload function with file buffer
        const uploadResult = await uploadToCloudinary(proofOfPayment.buffer, {
          folder: 'offline-payments',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        imageUrl = uploadResult.imageUrl;
        pubId = uploadResult.pubId;
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new BadRequestException(
        'Failed to upload proof of payment to Cloudinary',
      );
    }

    // Create the offline payment record
    const payment = await this.prisma.offlinePayment.create({
      data: {
        student: { connect: { id: studentId } },
        invoice: { connect: { id: invoiceId } },
        amount,
        proofOfPayment: imageUrl && pubId ? { imageUrl, pubId } : undefined,
        school: { connect: { id: schoolId } },
        createdByUser: { connect: { id: user.id } },
        status: 'pending',
      },
    });

    return payment;
  }

  async approveOfflinePayment({
    paymentId,
    user,
    approve = true,
    rejectionReason,
  }: {
    paymentId: string;
    user: AuthenticatedUser;
    approve?: boolean;
    rejectionReason?: string;
  }) {
    const schoolId = user.schoolId;

    // Find the payment and related invoice assignment
    const payment = await this.prisma.offlinePayment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        invoice: {
          select: {
            amount: true,
          },
        },
        student: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status !== 'pending') {
      throw new HttpException('Payment already processed', 400);
    }

    // Get current invoice assignment
    const invoiceAssignment =
      await this.prisma.studentInvoiceAssignment.findFirst({
        where: {
          invoiceId: payment.invoiceId,
          studentId: payment.studentId,
          schoolId,
        },
      });

    if (!invoiceAssignment) {
      throw new NotFoundException('Invoice assignment not found');
    }

    if (approve) {
      // Calculate new outstanding amount
      const newOutstanding = Math.max(
        0,
        invoiceAssignment.outstanding - payment.amount,
      );
      const newPaid = invoiceAssignment.paid + payment.amount;

      // Determine new status
      let newStatus = invoiceAssignment.status;
      if (newOutstanding === 0) {
        newStatus = 'paid';
      } else if (newPaid > 0) {
        newStatus = 'partial';
      }

      // Update payment and invoice assignment in a transaction
      const result = await this.prisma.$transaction([
        this.prisma.offlinePayment.update({
          where: { id: paymentId },
          data: {
            status: 'approved',
            approvedBy: { connect: { id: user.id } },
            approvedAt: new Date(),
          },
        }),
        this.prisma.studentInvoiceAssignment.update({
          where: { id: invoiceAssignment.id },
          data: {
            outstanding: newOutstanding,
            paid: newPaid,
            status: newStatus,
          },
        }),
      ]);

      return result[0]; // Return the updated payment record
    } else {
      // Reject the payment
      const rejectedPayment = await this.prisma.offlinePayment.update({
        where: { id: paymentId },
        data: {
          status: 'rejected',
          rejectionReason,
          approvedBy: { connect: { id: user.id } },
          approvedAt: new Date(),
        },
      });

      return rejectedPayment;
    }
  }

  async approveDiscount(discountId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;

    // First fetch the discount to check its current status
    const existingDiscount = await this.prisma.discount.findFirst({
      where: { id: discountId, schoolId },
    });

    if (!existingDiscount) {
      throw new NotFoundException('Discount not found');
    }

    // Check if already approved
    if (existingDiscount.status === DiscountStatus.approved) {
      throw new HttpException('Discount has already been approved', 400);
    }

    // Check if expired
    if (existingDiscount.dueDate && existingDiscount.dueDate < new Date()) {
      throw new HttpException('Cannot approve expired discount', 400);
    }

    // Check if in pending state
    if (existingDiscount.status !== DiscountStatus.pending) {
      throw new HttpException('Only pending discounts can be approved', 400);
    }

    // If all checks pass, approve the discount
    const discount = await this.prisma.discount.update({
      where: { id: discountId, schoolId },
      data: {
        status: DiscountStatus.approved,
        approvedBy: { connect: { id: user.id } },
        approvedAt: new Date(),
      },
      include: {
        invoice: {
          select: {
            title: true,
            reference: true,
          },
        },
        approvedBy: {
          select: {
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    // Apply discount to all assignments for the invoice
    await this.applyDiscountToAssignments(
      discount.invoiceId,
      discount.amount,
      schoolId,
    );

    return {
      message: 'Discount approved successfully',
      data: discount,
    };
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
   * Get all offline payments for a school
   */
  async getOfflinePayments({
    user,
    classId,
    termId,
    sessionId,
    classArmId,
    search,
    page,
    limit,
    skip,
    status,
  }: {
    user: AuthenticatedUser;
    classId?: string;
    termId?: string;
    sessionId?: string;
    classArmId?: string;
    search?: string;
    status?: 'pending' | 'approved' | 'rejected';
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

    // Build where conditions
    const where: any = {
      schoolId,
    };

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add session and term filters to invoice relation
    if (sessionId || termId || classId || classArmId) {
      where.invoice = {
        AND: [
          sessionId ? { sessionId } : {},
          termId ? { termId } : {},
          classArmId ? { classArmId } : {},
          classId
            ? {
                classes: {
                  some: {
                    classId: classId,
                  },
                },
              }
            : {},
        ],
      };
    }

    // Add search filter for student name
    if (search) {
      where.student = {
        ...where.student,
        user: {
          OR: [
            { firstname: { contains: search } },
            { lastname: { contains: search } },
            {
              AND: [
                { firstname: { contains: search.split(' ')[0] || '' } },
                { lastname: { contains: search.split(' ')[1] || '' } },
              ],
            },
          ],
        },
      };
    }

    // Get total count for pagination
    const total = await this.prisma.offlinePayment.count({
      where,
    });

    // Get paginated data with relations
    const payments = await this.prisma.offlinePayment.findMany({
      where,
      include: {
        invoice: {
          include: {
            session: true,
            term: true,
          },
        },
        student: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
            class: true,
            classArm: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get all offline payments for a student
   */
  async getOfflinePaymentById(paymentId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    const payment = await this.prisma.offlinePayment.findFirst({
      where: {
        id: paymentId,
        schoolId,
      },
      include: {
        invoice: {
          include: {
            session: true,
            term: true,
          },
        },
        student: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
            class: true,
            classArm: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Offline payment not found');
    }

    return payment;
  }

  async getStudentOfflinePayments(studentId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    return this.prisma.offlinePayment.findMany({
      where: {
        studentId,
        schoolId,
      },
      include: {
        invoice: true,
        student: {
          include: {
            user: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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

  async getPaymentDashboardStats(user: AuthenticatedUser) {
    const schoolId = user.schoolId;

    // Get aggregated stats per class in a single query
    const classStats = await this.prisma.class.findMany({
      where: {
        schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get overall payment stats
    const overallStats = await this.prisma.studentInvoiceAssignment.aggregate({
      where: {
        schoolId,
      },
      _sum: {
        outstanding: true,
        paid: true,
      },
    });

    // Get per-class payment stats
    const classPaymentStats = await Promise.all(
      classStats.map(async (classItem) => {
        const stats = await this.prisma.studentInvoiceAssignment.aggregate({
          where: {
            schoolId,
            student: {
              classId: classItem.id,
            },
          },
          _sum: {
            outstanding: true,
            paid: true,
          },
        });

        return {
          classId: classItem.id,
          className: classItem.name,
          studentCount: classItem._count.students,
          paidAmount: stats._sum.paid || 0,
          outstandingAmount: stats._sum.outstanding || 0,
          totalAmount: (stats._sum.paid || 0) + (stats._sum.outstanding || 0),
        };
      }),
    );

    const totalPaid = overallStats._sum.paid || 0;
    const totalOutstanding = overallStats._sum.outstanding || 0;
    const totalExpectedRevenue = totalPaid + totalOutstanding;

    return {
      summary: {
        expectedRevenue: totalExpectedRevenue,
        generatedRevenue: totalPaid,
        outstandingRevenue: totalOutstanding,
      },
      classStats: classPaymentStats,
    };
  }
}
