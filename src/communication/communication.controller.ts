import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress } from 'express';
import { CreateEvent, updateEvent as updateEventDto } from './dto/event.dto';

@Controller('communication')
export class CommunicationController {
  constructor(private communicationService: CommunicationService) {}

  @Post('events/create')
  @UseGuards(JwtAuthGuard)
  async createEvent(
    @Body() createEvent: CreateEvent,
    @Request() req: any,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.communicationService.createEvent(createEvent, user);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  async getEventsBySchool(@Request() req: RequestExpress): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.communicationService.getEventsBySchool(user);
  }

  @Get('events/:eventId')
  @UseGuards(JwtAuthGuard)
  async getEventById(
    @Request() req: RequestExpress,
    @Param('eventId') eventId: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.communicationService.getEventById(eventId, user);
  }

  @Patch('events/:eventId')
  @UseGuards(JwtAuthGuard)
  async updateEvent(
    @Request() req: RequestExpress,
    @Param('eventId') eventId: string,
    @Body() updateEvent: updateEventDto,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    const event = await this.communicationService.getEventById(eventId, user);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return this.communicationService.updateEvent(eventId, updateEvent, user);
  }
}
