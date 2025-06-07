import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  GetSubscriptionsDto,
  UpdateSubscriptionDto,
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'checkExpiredSubscriptions', timeZone: 'Africa/Lagos' })
  async handleExpiredSubscriptions() {
    this.logger.log('Running expired subscription check...');

    const currentDate = new Date();
    const expiredSchools = await this.prisma.school.findMany({
      where: {
        subscriptionStatus: true,
        subscriptionExpiresAt: {
          lt: currentDate, // Less than current date
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

    this.logger.log(`Processed ${expiredSchools.length} expired subscriptions.`);
  }
  async createSubscription(body: any) {
    const { name, duration, studentLimit } = body;
    try {
      const findName = await this.prisma.subscription.findUnique({
        where: {
          name,
        },
      });
      if (findName)
        throw new UnauthorizedException(
          'This subscription name already exists',
        );
      const subscription = await this.prisma.subscription.create({
        data: {
          name,
          duration,
          studentLimit,
        },
      });
      return subscription;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  async getAllSubscription(dto: GetSubscriptionsDto) {
    const { search, isActive, page = 1, limit = 10 } = dto;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Page must be a positive number');
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new BadRequestException('Limit must be a positive number');
    }

    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const skip = (pageNum - 1) * limitNum;

    try {
      const [subscriptions, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: limitNum,
          select: {
            id: true,
            name: true,
            studentLimit: true,
            duration: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      return {
        data: subscriptions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw new InternalServerErrorException('Failed to fetch subscriptions');
    }
  }

  async updateSubscription(id: string, body: UpdateSubscriptionDto) {
    // Check if subscription exists
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!existingSubscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    // Check for name uniqueness (if name is provided and different)
    if (body.name && body.name !== existingSubscription.name) {
      const nameExists = await this.prisma.subscription.findUnique({
        where: { name: body.name },
      });
      if (nameExists) {
        throw new BadRequestException('This subscription name already exists');
      }
    }

    // Build the data object with only provided fields
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.studentLimit !== undefined) data.studentLimit = body.studentLimit;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    try {
      const subscription = await this.prisma.subscription.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          studentLimit: true,
          duration: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  async deleteSubscription(id: string) {
    try {
      const subscription = await this.prisma.subscription.delete({
        where: { id },
      });
      if (!subscription) throw new NotFoundException('Subscription not found');
      return { message: 'Subscription deleted successfully' };
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw new InternalServerErrorException('Failed to delete subscription');
    }
  }

  async getSubscriptionGraph(userId: string) {
    // Verify user is Admin
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
    const months: { month: string; sub: number }[] = [];

    // Generate 12 months array
    for (let i = 0; i < 12; i++) {
      const currentMonth = moment(startDate).add(i, 'months');
      const monthName = currentMonth.format('MMMM');
      const monthStart = currentMonth.startOf('month').toDate();
      const monthEnd = currentMonth.endOf('month').toDate();

      const subCount = await this.prisma.subscription.count({
        where: {
          isDeleted: false,
          isActive: true,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      months.push({ month: monthName, sub: subCount });
    }

    return months;
  }

  async assignSubscriptionToSchool(
    body: any,
    user: AuthenticatedUser,
    req: any,
    res: any,
  ) {
    const { subscriptionId, email, metadata } = body;
    const schoolId = user.schoolId;

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const amount = subscription.amount * 100; // Convert to kobo

    const newSubscriptionPayment = await this.prisma.subscriptionPayment.create(
      {
        data: { subscriptionId, schoolId, amount },
      },
    );

    const params = JSON.stringify({
      subscription: subscriptionId,
      school: schoolId,
      amount,
      email,
      metadata,
      // callback_url: 'http://localhost:3000/order-recieved',
      callback_url: `${req.headers.origin}/order-recieved`,
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, // Ensure your Paystack secret key is properly set in the .env file
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
          console.log('data', data);

          if (parsedData.status) {
            // Update the subscription payment with the reference from Paystack
            await this.prisma.subscriptionPayment.update({
              where: { id: newSubscriptionPayment.id },
              data: { reference: parsedData.data.reference },
            });

            return res.json({
              message: 'Payment initialized successfully',
              // orderIds: orders.map((order) => order._id),
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
    
          console.log(hash)
        if (hash !== paystackSignature) {
          return res.status(400).json({ message: 'Invalid signature' });
        }
    
        const event = payload;
        const data = event.data;
    
        if (event.event === 'charge.success') {
          // Find all orders with the same paymentReference
          const paymentReference = await this.prisma.subscriptionPayment.findFirst({
            where:{reference: data.reference},
            include:{subscription: true, school: true},
          });
    
          if (!paymentReference) {
            return res.status(404).json({ message: 'Payment data not found!' });
          }

          // Update the payment status to 'paid'
          const updatedPayment = await this.prisma.subscriptionPayment.update({
            where: { id: paymentReference.id },
            data: {
              paymentStatus: 'success',
              paymentDate: new Date(),
            },
          });

// Custom function to calculate expiry date
const calculateExpiryDate = (duration: number) => {
  const currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() + duration);
  return currentDate;
};

          // update school subscription details
          const schoolSubscription = await this.prisma.school.update({
            where: { id: paymentReference.schoolId },
            data: {
              // schoolId: paymentReference.schoolId,
              subscriptionId: paymentReference.subscriptionId,
              subscriptionStatus: true,
              subscriptionExpiresAt: calculateExpiryDate(paymentReference.subscription.duration),
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

}
