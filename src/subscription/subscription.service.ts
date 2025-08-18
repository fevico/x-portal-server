import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  GetSubscriptionPackagesDto,
  UpdateSubscriptionPackageDto,
  CreateSubscriptionPackageDto,
  SubscribeSchoolDto,
  ExtendSubscriptionDto,
  AssignSubscriptionDto,
} from './dto/subscription.dto';
import { Logger } from '@nestjs/common';
import * as moment from 'moment';
import { AuthenticatedUser } from '@/types/express';
import * as https from 'https';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'checkExpiredSubscriptions',
    timeZone: 'Africa/Lagos',
  })
  async handleExpiredSubscriptions() {
    this.logger.log('Running expired subscription check...');

    const currentDate = new Date();
    const expiredSchools = await this.prisma.school.findMany({
      where: {
        subscriptionStatus: true,
        subscriptionExpiresAt: {
          lt: currentDate,
        },
      },
    });

    if (expiredSchools.length === 0) {
      this.logger.log('No expired subscriptions found.');
      return;
    }

    for (const school of expiredSchools) {
      await this.prisma.school.update({
        where: { id: school.id },
        data: {
          subscriptionStatus: false,
        },
      });
      this.logger.log(`Deactivated subscription for school ID: ${school.id}`);
    }

    this.logger.log(
      `Processed ${expiredSchools.length} expired subscriptions.`,
    );
  }

  // Helper method to get default features for packages
  private getDefaultFeatures(packageName: string): any {
    const defaultFeatures = {
      Basic: {
        studentLimit: 100,
        teachers: 5,
        subjects: 10,
        storage: '1GB',
        support: 'Email',
        reports: 'Basic',
        modules: ['Students', 'Teachers', 'Classes'],
      },
      Starter: {
        studentLimit: 300,
        teachers: 15,
        subjects: 20,
        storage: '5GB',
        support: 'Email & Chat',
        reports: 'Standard',
        modules: ['Students', 'Teachers', 'Classes', 'Attendance', 'Results'],
      },
      Professional: {
        studentLimit: 800,
        teachers: 40,
        subjects: 50,
        storage: '20GB',
        support: 'Priority Support',
        reports: 'Advanced',
        modules: ['All Modules', 'CBT', 'Fee Management', 'Communication'],
      },
      Enterprise: {
        studentLimit: 2000,
        teachers: 100,
        subjects: 'Unlimited',
        storage: '100GB',
        support: '24/7 Priority',
        reports: 'Premium Analytics',
        modules: ['All Modules', 'API Access', 'Custom Integration'],
      },
      'Premium Annual': {
        studentLimit: 5000,
        teachers: 'Unlimited',
        subjects: 'Unlimited',
        storage: '500GB',
        support: 'Dedicated Manager',
        reports: 'Enterprise Analytics',
        modules: ['Everything', 'White Label', 'Multi-Campus'],
      },
    };

    return defaultFeatures[packageName] || defaultFeatures['Basic'];
  }

  // Create Subscription Package
  async createSubscriptionPackage(body: CreateSubscriptionPackageDto) {
    const { name, amount, duration, studentLimit, features, isActive } = body;

    try {
      const existingPackage = await this.prisma.subscription.findUnique({
        where: { name },
      });

      if (existingPackage) {
        throw new BadRequestException('Package name already exists');
      }

      const subscriptionPackage = await this.prisma.subscription.create({
        data: {
          name,
          amount,
          duration,
          studentLimit,
          features: features || this.getDefaultFeatures(name),
          isActive: isActive ?? true,
        },
      });

      return {
        message: 'Subscription package created successfully',
        data: subscriptionPackage,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create subscription package',
      );
    }
  }

  // Get all subscription packages
  async getAllSubscriptionPackages(dto: GetSubscriptionPackagesDto) {
    const { search, isActive, page = 1, limit = 10 } = dto;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Page must be a positive number');
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new BadRequestException('Limit must be a positive number');
    }

    const where: any = { isDeleted: false };

    if (search) {
      where.OR = [{ name: { contains: search } }];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const skip = (pageNum - 1) * limitNum;

    try {
      const [packages, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: limitNum,
          select: {
            id: true,
            name: true,
            amount: true,
            studentLimit: true,
            duration: true,
            features: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                schools: true,
                payments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      return {
        data: packages,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error fetching subscription packages:', error);
      throw new InternalServerErrorException(
        'Failed to fetch subscription packages',
      );
    }
  }

  // Get subscription package by ID
  async getSubscriptionPackageById(id: string) {
    try {
      const subscriptionPackage = await this.prisma.subscription.findUnique({
        where: { id, isDeleted: false },
        include: {
          _count: {
            select: {
              schools: true,
              payments: true,
            },
          },
        },
      });

      if (!subscriptionPackage) {
        throw new NotFoundException('Subscription package not found');
      }

      return {
        data: subscriptionPackage,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch subscription package',
      );
    }
  }

  // Update subscription package
  async updateSubscriptionPackage(
    id: string,
    body: UpdateSubscriptionPackageDto,
  ) {
    const existingPackage = await this.prisma.subscription.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existingPackage) {
      throw new NotFoundException(
        `Subscription package with ID ${id} not found`,
      );
    }

    if (body.name && body.name !== existingPackage.name) {
      const nameExists = await this.prisma.subscription.findUnique({
        where: { name: body.name },
      });
      if (nameExists) {
        throw new BadRequestException('Package name already exists');
      }
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.studentLimit !== undefined) data.studentLimit = body.studentLimit;
    if (body.features !== undefined) data.features = body.features;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    try {
      const updatedPackage = await this.prisma.subscription.update({
        where: { id },
        data,
      });

      return {
        message: 'Subscription package updated successfully',
        data: updatedPackage,
      };
    } catch (error) {
      console.error('Error updating subscription package:', error);
      throw new InternalServerErrorException(
        'Failed to update subscription package',
      );
    }
  }

  // Soft delete subscription package
  async deleteSubscriptionPackage(id: string) {
    try {
      const existingPackage = await this.prisma.subscription.findUnique({
        where: { id, isDeleted: false },
      });

      if (!existingPackage) {
        throw new NotFoundException('Subscription package not found');
      }

      await this.prisma.subscription.update({
        where: { id },
        data: { isDeleted: true, isActive: false },
      });

      return { message: 'Subscription package deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting subscription package:', error);
      throw new InternalServerErrorException(
        'Failed to delete subscription package',
      );
    }
  }

  // Subscribe School to Package (Online Payment)
  async subscribeSchoolToPackage(
    body: SubscribeSchoolDto,
    user: AuthenticatedUser,
    req: any,
    res: any,
  ) {
    const { packageId, email, metadata } = body;
    const schoolId = user.schoolId;

    const subscriptionPackage = await this.prisma.subscription.findUnique({
      where: { id: packageId, isActive: true, isDeleted: false },
    });

    if (!subscriptionPackage) {
      throw new NotFoundException('Subscription package not found');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const amount = subscriptionPackage.amount * 100; // Convert to kobo

    const newSubscriptionPayment = await this.prisma.subscriptionPayment.create(
      {
        data: {
          subscriptionId: packageId,
          schoolId: schoolId,
          amount: amount / 100, // Store in Naira
          paymentMethod: 'online', // Will be updated with actual method (card, bank, ussd, etc.) from Paystack webhook
          createdBy: user.id,
        },
      },
    );

    const params = JSON.stringify({
      amount,
      email,
      metadata: {
        ...metadata,
        subscription_package_id: packageId,
        school_id: schoolId,
        payment_id: newSubscriptionPayment.id,
      },
      callback_url: `${req.headers.origin}/payment/success`,
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const reqPaystack = https.request(options, async (respaystack) => {
      let data = '';

      respaystack.on('data', (chunk) => {
        data += chunk;
      });

      respaystack.on('end', async () => {
        try {
          const parsedData = JSON.parse(data);

          if (parsedData.status) {
            await this.prisma.subscriptionPayment.update({
              where: { id: newSubscriptionPayment.id },
              data: { reference: parsedData.data.reference },
            });

            return res.json({
              message: 'Payment initialized successfully',
              data: parsedData.data,
            });
          } else {
            console.error('Payment initialization failed:', parsedData.message);
            return res.status(400).json({
              message: 'Failed to initialize payment',
              error: parsedData.message,
            });
          }
        } catch (error) {
          console.error(
            'Error processing payment initialization response:',
            error,
          );
          return res.status(500).json({
            message: 'Error processing payment initialization response',
          });
        }
      });
    });

    reqPaystack.on('error', (error) => {
      console.error('Error with Paystack request:', error);
      return res.status(500).json({ message: 'Internal Server Error', error });
    });

    reqPaystack.write(params);
    reqPaystack.end();
  }

  // Extend School Subscription (with rollover logic)
  async extendSchoolSubscription(
    body: ExtendSubscriptionDto,
    user: AuthenticatedUser,
    req: any,
    res: any,
  ) {
    const { packageId, email, additionalMonths, metadata } = body;
    const schoolId = user.schoolId;

    const subscriptionPackage = await this.prisma.subscription.findUnique({
      where: { id: packageId, isActive: true, isDeleted: false },
    });

    if (!subscriptionPackage) {
      throw new NotFoundException('Subscription package not found');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Calculate pro-rated amount for extension
    const extensionDuration = additionalMonths || subscriptionPackage.duration;
    const amount = subscriptionPackage.amount * extensionDuration * 100; // Convert to kobo

    const newSubscriptionPayment = await this.prisma.subscriptionPayment.create(
      {
        data: {
          subscriptionId: packageId,
          schoolId,
          amount: amount / 100,
          paymentMethod: 'online', // Will be updated with actual method (card, bank, ussd, etc.) from Paystack webhook
          createdBy: user.id,
        },
      },
    );

    const params = JSON.stringify({
      amount,
      email,
      metadata: {
        ...metadata,
        subscription_package_id: packageId,
        school_id: schoolId,
        payment_id: newSubscriptionPayment.id,
        is_extension: true,
        extension_months: extensionDuration,
      },
      callback_url: `${req.headers.origin}/subscription-success`,
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const reqPaystack = https.request(options, async (respaystack) => {
      let data = '';

      respaystack.on('data', (chunk) => {
        data += chunk;
      });

      respaystack.on('end', async () => {
        try {
          const parsedData = JSON.parse(data);

          if (parsedData.status) {
            await this.prisma.subscriptionPayment.update({
              where: { id: newSubscriptionPayment.id },
              data: { reference: parsedData.data.reference },
            });

            return res.json({
              message: 'Extension payment initialized successfully',
              data: parsedData.data,
            });
          } else {
            return res.status(400).json({
              message: 'Failed to initialize extension payment',
              error: parsedData.message,
            });
          }
        } catch (error) {
          return res.status(500).json({
            message: 'Error processing extension payment',
          });
        }
      });
    });

    reqPaystack.on('error', (error) => {
      console.error('Error with Paystack request:', error);
      return res.status(500).json({ message: 'Internal Server Error', error });
    });

    reqPaystack.write(params);
    reqPaystack.end();
  }

  // Assign Subscription Package to School (Offline Payment)
  async assignSubscriptionToSchool(body: AssignSubscriptionDto) {
    const { schoolId, packageId, paymentMethod, paymentReference, metadata } =
      body;

    const subscriptionPackage = await this.prisma.subscription.findUnique({
      where: { id: packageId, isActive: true, isDeleted: false },
    });

    if (!subscriptionPackage) {
      throw new NotFoundException('Subscription package not found');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    try {
      // Create payment record
      const payment = await this.prisma.subscriptionPayment.create({
        data: {
          subscriptionId: packageId,
          schoolId,
          amount: subscriptionPackage.amount,
          paymentMethod: paymentMethod || 'offline',
          reference: paymentReference,
          paymentStatus: 'success',
          paymentDate: new Date(),
        },
      });

      // Calculate expiry date with rollover logic
      const expiryDate = this.calculateExpiryDate(
        school.subscriptionExpiresAt,
        subscriptionPackage.duration,
      );

      // Update school subscription
      const updatedSchool = await this.prisma.school.update({
        where: { id: schoolId },
        data: {
          subscriptionId: packageId,
          subscriptionStatus: true,
          subscriptionExpiresAt: expiryDate,
        },
      });

      return {
        message: 'Subscription assigned successfully',
        data: {
          school: updatedSchool,
          payment,
          expiryDate,
        },
      };
    } catch (error) {
      console.error('Error assigning subscription:', error);
      throw new InternalServerErrorException('Failed to assign subscription');
    }
  }

  // Helper method to calculate expiry date with rollover
  private calculateExpiryDate(
    currentExpiryDate: Date | null,
    durationInMonths: number,
  ): Date {
    const now = new Date();

    // If no current expiry or already expired, start from now
    if (!currentExpiryDate || currentExpiryDate <= now) {
      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + durationInMonths);
      return newDate;
    }

    // If still active, extend from current expiry date (rollover)
    const rolloverDate = new Date(currentExpiryDate);
    rolloverDate.setMonth(rolloverDate.getMonth() + durationInMonths);
    return rolloverDate;
  }

  // Get subscription analytics/graph
  async getSubscriptionGraph(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subRole: true },
    });

    if (!user || user.subRole.name !== 'Admin' || !user.subRole.isGlobal) {
      throw new HttpException(
        'Unauthorized: Admin access required',
        HttpStatus.FORBIDDEN,
      );
    }

    const endDate = moment().endOf('month');
    const startDate = moment(endDate).subtract(11, 'months').startOf('month');
    const months: { month: string; subscriptions: number; revenue: number }[] =
      [];

    for (let i = 0; i < 12; i++) {
      const currentMonth = moment(startDate).add(i, 'months');
      const monthName = currentMonth.format('MMMM');
      const monthStart = currentMonth.startOf('month').toDate();
      const monthEnd = currentMonth.endOf('month').toDate();

      const [subscriptionCount, revenue] = await Promise.all([
        this.prisma.subscriptionPayment.count({
          where: {
            paymentStatus: 'success',
            paymentDate: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        this.prisma.subscriptionPayment.aggregate({
          where: {
            paymentStatus: 'success',
            paymentDate: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      months.push({
        month: monthName,
        subscriptions: subscriptionCount,
        revenue: revenue._sum.amount || 0,
      });
    }

    return months;
  }

  // Webhook handler for Paystack
  async webhook(req: any, res: any) {
    try {
      const payload = req.body;
      const paystackSignature = req.headers['x-paystack-signature'];

      if (!paystackSignature) {
        return res.status(400).json({ message: 'Missing signature' });
      }

      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== paystackSignature) {
        return res.status(400).json({ message: 'Invalid signature' });
      }

      const event = payload;
      const data = event.data;

      if (event.event === 'charge.success') {
        const paymentRecord = await this.prisma.subscriptionPayment.findFirst({
          where: { reference: data.reference },
          include: { subscription: true, school: true },
        });

        if (!paymentRecord) {
          return res.status(404).json({ message: 'Payment data not found!' });
        }

        const updatedPayment = await this.prisma.subscriptionPayment.update({
          where: { id: paymentRecord.id },
          data: {
            paymentStatus: 'success',
            paymentDate: new Date(),
            paymentMethod: data.channel || 'online', // Update with actual payment method from Paystack
          },
        });

        // Check if it's an extension payment
        const isExtension = data.metadata?.is_extension;
        const extensionMonths =
          data.metadata?.extension_months ||
          paymentRecord.subscription.duration;

        const expiryDate = this.calculateExpiryDate(
          paymentRecord.school.subscriptionExpiresAt,
          isExtension ? extensionMonths : paymentRecord.subscription.duration,
        );

        const schoolSubscription = await this.prisma.school.update({
          where: { id: paymentRecord.schoolId },
          data: {
            subscriptionId: paymentRecord.subscriptionId,
            subscriptionStatus: true,
            subscriptionExpiresAt: expiryDate,
          },
        });

        console.log('Payment processed successfully:', updatedPayment);
        return res.status(200).json({
          message: 'Payment processed successfully',
          data: {
            payment: updatedPayment,
            schoolSubscription,
          },
        });
      }
    } catch (err) {
      console.error('Error processing webhook:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // Get School Plan Details
  async getSchoolPlan(user: AuthenticatedUser) {
    try {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
        include: {
          subscription: {
            select: {
              id: true,
              name: true,
              amount: true,
              duration: true,
              studentLimit: true,
              features: true,
              isActive: true,
            },
          },
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      const currentDate = new Date();
      const isExpired = school.subscriptionExpiresAt
        ? school.subscriptionExpiresAt < currentDate
        : true;

      const daysUntilExpiry = school.subscriptionExpiresAt
        ? Math.ceil(
            (school.subscriptionExpiresAt.getTime() - currentDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      // Get current student count
      const studentCount = await this.prisma.student.count({
        where: {
          user: { schoolId: user.schoolId },
          isDeleted: false,
        },
      });

      // Get payment history
      const paymentHistory = await this.prisma.subscriptionPayment.findMany({
        where: {
          schoolId: user.schoolId,
          paymentStatus: 'success',
        },
        include: {
          subscription: {
            select: {
              name: true,
              duration: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
        take: 10,
      });

      return {
        schoolInfo: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          subscriptionStatus: school.subscriptionStatus,
          subscriptionExpiresAt: school.subscriptionExpiresAt,
          isExpired,
          daysUntilExpiry,
        },
        currentPlan: school.subscription || null,
        usage: {
          currentStudents: studentCount,
          studentLimit: school.subscription?.studentLimit || 0,
          usagePercentage: school.subscription?.studentLimit
            ? Math.round(
                (studentCount / school.subscription.studentLimit) * 100,
              )
            : 0,
        },
        paymentHistory,
        status: {
          canAddStudents: school.subscription
            ? studentCount < school.subscription.studentLimit
            : false,
          needsUpgrade: school.subscription
            ? studentCount >= school.subscription.studentLimit * 0.9
            : true,
          isActive: school.subscriptionStatus && !isExpired,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching school plan:', error);
      throw new InternalServerErrorException('Failed to fetch school plan');
    }
  }

  // Manual Payment Verification
  async verifyPayment(reference: string) {
    try {
      // Find the payment record
      const paymentRecord = await this.prisma.subscriptionPayment.findFirst({
        where: { reference },
        include: {
          subscription: true,
          school: true,
        },
      });

      if (!paymentRecord) {
        throw new NotFoundException(
          `Payment with reference ${reference} not found`,
        );
      }

      // If already processed, return current status
      if (paymentRecord.paymentStatus === 'success') {
        return {
          message: 'Payment already verified and processed',
          data: {
            payment: paymentRecord,
            status: 'already_processed',
            school: paymentRecord.school,
          },
        };
      }

      // Verify with Paystack
      const paystackVerification = await this.verifyWithPaystack(reference);

      if (!paystackVerification.success) {
        return {
          message: 'Payment verification failed',
          data: {
            payment: paymentRecord,
            status: 'verification_failed',
            error: paystackVerification.error,
          },
        };
      }

      // Update payment status
      const updatedPayment = await this.prisma.subscriptionPayment.update({
        where: { id: paymentRecord.id },
        data: {
          paymentStatus: 'success',
          paymentDate: new Date(),
          paymentMethod: paystackVerification.data?.channel || 'online', // Update with actual payment method
        },
      });

      // Calculate expiry date with rollover logic
      const isExtension = paystackVerification.data?.metadata?.is_extension;
      const extensionMonths =
        paystackVerification.data?.metadata?.extension_months ||
        paymentRecord.subscription.duration;

      const expiryDate = this.calculateExpiryDate(
        paymentRecord.school.subscriptionExpiresAt,
        isExtension ? extensionMonths : paymentRecord.subscription.duration,
      );

      // Update school subscription
      const updatedSchool = await this.prisma.school.update({
        where: { id: paymentRecord.schoolId },
        data: {
          subscriptionId: paymentRecord.subscriptionId,
          subscriptionStatus: true,
          subscriptionExpiresAt: expiryDate,
        },
      });

      this.logger.log(
        `Manual verification successful for reference: ${reference}`,
      );

      return {
        message: 'Payment verified and processed successfully',
        data: {
          payment: updatedPayment,
          school: updatedSchool,
          status: 'verified_and_processed',
          expiryDate,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error during manual payment verification:', error);
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  // Helper method to verify payment with Paystack
  private async verifyWithPaystack(reference: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);

            if (parsedData.status && parsedData.data.status === 'success') {
              resolve({
                success: true,
                data: parsedData.data,
              });
            } else {
              resolve({
                success: false,
                error: parsedData.message || 'Payment verification failed',
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to parse Paystack response',
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: `Paystack request failed: ${error.message}`,
        });
      });

      req.end();
    });
  }
}
