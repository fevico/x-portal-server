import { PrismaService } from '@/prisma/prisma.service';
import { AuthenticatedUser } from '@/types/express';
import { HttpException, Injectable } from '@nestjs/common';
import { CreateEvent, updateEvent } from './dto/event.dto';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  async createEvent(createEvent: CreateEvent, user: AuthenticatedUser) {
    // create event
    const schoolId = user.schoolId;
    const { name, eventDescription, startDate, endDate, eventColor } =
      createEvent;
    try {
      const event = await this.prisma.communication.create({
        data: {
          name,
          eventDescription,
          startDate,
          endDate,
          eventColor,
          // schoolId,
          school: { connect: { id: schoolId } },
          createdByUser: { connect: { id: user.id } },
        },
      });
      return event;
    } catch (error) {
      throw new HttpException('Failed to create event', 500);
    }
  }

  async getEventsBySchool(user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    try {
      const events = await this.prisma.communication.findMany({
        where: { schoolId },
        orderBy: { startDate: 'asc' }, // Order by start date
      });
      return {
        statusCode: 200,
        message: 'Events retrieved successfully',
        data: events,
      };
    } catch (error) {
      throw new HttpException('Failed to retrieve events', 500);
    }
  }

  async getEventById(eventId: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    try {
      const event = await this.prisma.communication.findUnique({
        where: { id: eventId, schoolId },
      });
      if (!event) {
        throw new HttpException('Event not found', 404);
      }
      return {
        statusCode: 200,
        message: 'Event retrieved successfully',
        data: event,
      };
    } catch (error) {
      throw new HttpException(`Error fetching event with ID ${eventId}`, 500);
    }
  }

  async updateEvent(
    eventId: string,
    updateData: updateEvent,
    user: AuthenticatedUser,
  ) {
    const schoolId = user.schoolId;
    try {
      const updatedEvent = await this.prisma.communication.update({
        where: { id: eventId, schoolId },
        data: updateData,
      });
      if (!updatedEvent) throw new HttpException('Event not found', 404);
      return {
        statusCode: 200,
        message: 'Event updated successfully',
        data: updatedEvent,
      };
    } catch (error) {
      throw new HttpException(`Error updating event with ID ${eventId}`, 500);
    }
  }
}
