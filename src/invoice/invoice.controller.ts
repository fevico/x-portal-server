import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
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

  // @Get('list')
  // async allSchoolInvoice(
  //   @Request() req: RequestExpress,
  //   @Query('classId') classId: string,
  //   @Query('termId') termId: string,
  //   @Query('sessionId') sessionId: string,
  //   @Query('classArmId') classArmId: string,
  //   @Query("search") search: string,
  // ): Promise<any> {
  //   const user = req.user as AuthenticatedUser;
  //   return this.invoiceService.allSchoolInvoice(user);
  // }

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

  @Put(':invoiceId')
  @UseGuards(JwtAuthGuard)
  async updateDiscountInvoice( 
    @Request() req: RequestExpress,
    @Param('invoiceId') invoiceId: string,
    @Body() body: UpdateInvoiceDto,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    const invoice = await this.invoiceService.getInvoiceById(invoiceId, user);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.invoiceService.updateDiscountInvoice(invoiceId, body, user);
  }
}
