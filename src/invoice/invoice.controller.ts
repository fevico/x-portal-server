import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress } from 'express';

@Controller('invoice')
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateInvoice(
    @Body() body: InvoiceDto,
    @Request() req: RequestExpress,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;

    return this.invoiceService.generateInvoice(body, user);
  }

  @Get('reference/:reference')
  @UseGuards(JwtAuthGuard)
  async getInvoiceByReference(
    @Request() req: RequestExpress,
    @Param('reference') reference: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.getInvoiceByReference(reference, user);
  }

  @Delete(':invoiceId')
  @UseGuards(JwtAuthGuard)
  async deleteInvoice(
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.deleteInvoice(invoiceId, user);
  }

  @Get('list')
  async allSchoolInvoice(
    @Request() req: RequestExpress,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
    @Query('sessionId') sessionId: string,
    @Query('classArmId') classArmId: string,
    @Query('search') search: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;

    // Convert page and limit to numbers and calculate skip
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    return this.invoiceService.allSchoolInvoice({
      user,
      classId,
      termId,
      sessionId,
      classArmId,
      search,
      page: pageNum,
      limit: limitNum,
      skip,
    });
  }

  @Get(':invoiceId')
  @UseGuards(JwtAuthGuard)
  async getInvoiceById(
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.getInvoiceById(invoiceId, user);
  }

  @Patch(':invoiceId')
  @UseGuards(JwtAuthGuard)
  async updateInvoice(
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
    @Body() body: UpdateInvoiceDto,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    const invoice = await this.invoiceService.getInvoiceById(invoiceId, user);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.invoiceService.updateInvoice(invoiceId, body, user);
  }

  @Get(':invoiceId/students')
  @UseGuards(JwtAuthGuard)
  async getInvoiceAssignments(
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.getInvoiceAssignments(invoiceId, user);
  }

  @Get('assignment/:assignmentId')
  @UseGuards(JwtAuthGuard)
  async getStudentInvoiceAssignment(
    @Request() req: RequestExpress,
    @Param('assignmentId') assignmentId: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.getStudentInvoiceAssignment(assignmentId, user);
  }

  @Patch('assignment/:assignmentId')
  @UseGuards(JwtAuthGuard)
  async updateStudentInvoiceAssignment(
    @Request() req: RequestExpress,
    @Param('assignmentId') assignmentId: string,
    @Body() body: any,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.updateStudentInvoiceAssignment(
      assignmentId,
      body,
      user,
    );
  }

  @Get('student/:studentId/assignments')
  @UseGuards(JwtAuthGuard)
  async getStudentAssignments(
    @Request() req: RequestExpress,
    @Param('studentId') studentId: string,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.getStudentAssignments(studentId, user);
  }

  // --- DISCOUNT ENDPOINTS ---

  @Post(':invoiceId/discount')
  @UseGuards(JwtAuthGuard)
  async createDiscount(
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { amount: number; description?: string; dueDate?: Date },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.createDiscount(
      {
        invoiceId,
        amount: body.amount,
        // description: body.description,
        dueDate: body.dueDate,
      },
      user,
    );
  }

  @Get(':invoiceId/discounts')
  @UseGuards(JwtAuthGuard)
  async listDiscounts(
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.listDiscounts(invoiceId, user);
  }

  @Get('discount/:discountId')
  @UseGuards(JwtAuthGuard)
  async getDiscount(
    @Request() req: RequestExpress,
    @Param('discountId') discountId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.getDiscount(discountId, user);
  }

  @Patch('discount/:discountId')
  @UseGuards(JwtAuthGuard)
  async updateDiscount(
    @Request() req: RequestExpress,
    @Param('discountId') discountId: string,
    @Body() body: { amount?: number; description?: string; dueDate?: Date },
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.updateDiscount(discountId, body, user);
  }

  @Post('discount/:discountId/approve')
  @UseGuards(JwtAuthGuard)
  async approveDiscount(
    @Request() req: RequestExpress,
    @Param('discountId') discountId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.approveDiscount(discountId, user);
  }

  @Post('discount/:discountId/expire')
  @UseGuards(JwtAuthGuard)
  async expireDiscount(
    @Request() req: RequestExpress,
    @Param('discountId') discountId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.expireDiscount(discountId, user);
  }
}
