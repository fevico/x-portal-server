import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetSubscriptionsDto, UpdateSubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}


    async createSubscription(body: any){
        const {name, duration, studentLimit} = body;
        try {
            const findName = await this.prisma.subscription.findUnique({
                where: {
                    name: name
                }
            })
            if(findName) throw new UnauthorizedException("This subscription name already exists")
            const subscription = await this.prisma.subscription.create({
                data: {
                    name,
                    duration,
                    student_limit:studentLimit
                }
            })
            return subscription;  
        } catch (error) {
            throw new UnauthorizedException(error.message)
        }

    }

    async getAllSubscription(dto: GetSubscriptionsDto) {
        const { search, isActive, page = 1, limit = 10 } = dto;
    
        const where: any = {};
    
        if (search) {
          where.name = {
            contains: search,
          };
        }
    
        if (isActive !== undefined) {
          where.isActive = isActive === 'true';
        }
    
        const skip = (page - 1) * limit;
    
        try {
          const [subscriptions, total] = await Promise.all([
            this.prisma.subscription.findMany({
              where,
              skip,
              take: limit,
              select: {
                id: true,
                name: true,
                student_limit: true,
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
        if (body.student_limit !== undefined) data.student_limit = body.student_limit;
        if (body.isActive !== undefined) data.isActive = body.isActive;
    
        try {
          const subscription = await this.prisma.subscription.update({
            where: { id },
            data,
            select: {
              id: true,
              name: true,
              student_limit: true,
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
          if(!subscription) throw new NotFoundException("Subscription not found")
          return { message: 'Subscription deleted successfully'};
        } catch (error) {
          console.error('Error deleting subscription:', error);
          throw new InternalServerErrorException('Failed to delete subscription');
        }
      }
}
