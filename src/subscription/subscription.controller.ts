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
  Request,
  Res,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import {
  GetSubscriptionsDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/auth.decorator';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superAdmin')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('create')
  async createSubscription(@Body() body: any): Promise<any> {
    return this.subscriptionService.createSubscription(body);
  }

  @Post('assign-subscription-to-school')
  @UseGuards(JwtAuthGuard)
  async assignSubscriptionToSchool(
    @Body() body: any,
    @Request() req: RequestExpress,
    @Res() res: Response,
    @Req() request: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.subscriptionService.assignSubscriptionToSchool(
      body,
      user,
      request,
      res,
    );
  }

  @Post('webhook')
  async webhook(@Body() body: any, @Res() res: any, @Req() req: any) {
    return this.subscriptionService.webhook(req, res);
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
