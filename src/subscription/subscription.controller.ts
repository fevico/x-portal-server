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
  GetSubscriptionPackagesDto,
  UpdateSubscriptionPackageDto,
  CreateSubscriptionPackageDto,
  SubscribeSchoolDto,
  ExtendSubscriptionDto,
  AssignSubscriptionDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/auth.decorator';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ===== PACKAGE MANAGEMENT (SuperAdmin) =====
  @Post('packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async createSubscriptionPackage(
    @Body() body: CreateSubscriptionPackageDto,
  ): Promise<any> {
    return this.subscriptionService.createSubscriptionPackage(body);
  }

  @Get('packages')
  async getAllSubscriptionPackages(@Query() query: GetSubscriptionPackagesDto) {
    return this.subscriptionService.getAllSubscriptionPackages(query);
  }

  @Get('packages/:id')
  async getSubscriptionPackageById(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionPackageById(id);
  }

  @Patch('packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async updateSubscriptionPackage(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionPackageDto,
  ) {
    return this.subscriptionService.updateSubscriptionPackage(id, body);
  }

  @Delete('packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async deleteSubscriptionPackage(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionPackage(id);
  }

  // ===== SCHOOL SUBSCRIPTION MANAGEMENT =====
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribeSchoolToPackage(
    @Body() body: SubscribeSchoolDto,
    @Request() req: RequestExpress,
    @Res() res: Response,
    @Req() request: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.subscriptionService.subscribeSchoolToPackage(
      body,
      user,
      request,
      res,
    );
  }

  @Post('extend')
  @UseGuards(JwtAuthGuard)
  async extendSchoolSubscription(
    @Body() body: ExtendSubscriptionDto,
    @Request() req: RequestExpress,
    @Res() res: Response,
    @Req() request: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.subscriptionService.extendSchoolSubscription(
      body,
      user,
      request,
      res,
    );
  }

  @Post('assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async assignSubscriptionToSchool(@Body() body: AssignSubscriptionDto) {
    return this.subscriptionService.assignSubscriptionToSchool(body);
  }

  // ===== ANALYTICS & REPORTING =====
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async getSubscriptionAnalytics(@Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.subscriptionService.getSubscriptionGraph(user.id);
  }

  // ===== SCHOOL PLAN DETAILS =====
  @Get('school-plan')
  @UseGuards(JwtAuthGuard)
  async getSchoolPlan(@Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.subscriptionService.getSchoolPlan(user);
  }

  // ===== WEBHOOK =====
  @Post('webhook')
  async webhook(@Body() body: any, @Res() res: any, @Req() req: any) {
    return this.subscriptionService.webhook(req, res);
  }

  // ===== PAYMENT VERIFICATION =====
  @Post('payments/verify/:reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async verifyPayment(@Param('reference') reference: string) {
    return this.subscriptionService.verifyPayment(reference);
  }

  // ===== LEGACY ENDPOINTS (For backward compatibility) =====
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async createSubscription(@Body() body: any): Promise<any> {
    // Map legacy request to new format
    const mappedBody: CreateSubscriptionPackageDto = {
      name: body.name,
      description: body.description || `${body.name} subscription package`,
      amount: body.amount || 0,
      duration: body.duration,
      studentLimit: body.studentLimit,
      features: body.features,
      isActive: body.isActive,
    };
    return this.subscriptionService.createSubscriptionPackage(mappedBody);
  }

  @Get('fetch')
  @UseGuards(JwtAuthGuard)
  async getAllSubscriptions(@Query() query: GetSubscriptionPackagesDto) {
    return this.subscriptionService.getAllSubscriptionPackages(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionPackageDto,
  ) {
    return this.subscriptionService.updateSubscriptionPackage(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  async deleteSubscription(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionPackage(id);
  }

  @Post('assign-subscription-to-school')
  @UseGuards(JwtAuthGuard)
  async assignSubscriptionToSchoolLegacy(
    @Body() body: any,
    @Request() req: RequestExpress,
    @Res() res: Response,
    @Req() request: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    // Map legacy request to new format
    const mappedBody: SubscribeSchoolDto = {
      packageId: body.subscriptionId || body.packageId,
      email: body.email,
      paymentMethod: 'online',
      metadata: body.metadata,
    };
    return this.subscriptionService.subscribeSchoolToPackage(
      mappedBody,
      user,
      request,
      res,
    );
  }
}
