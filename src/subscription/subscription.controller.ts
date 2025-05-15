import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import {
  GetSubscriptionsDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createSubscription(@Body() body: any): Promise<any> {
    return this.subscriptionService.createSubscription(body);
  }

  @Get('fetch')
  @UseGuards(JwtAuthGuard)
  async getAllSubscriptions(@Query() query: GetSubscriptionsDto) {
    return this.subscriptionService.getAllSubscription(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscription(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteSubscription(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscription(id);
  }
}
