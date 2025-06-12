import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress, Response } from 'express';

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

  @Get('list')
  async allSchoolInvoice(@Request() req: RequestExpress): Promise<any> {
    const user = req.user as AuthenticatedUser;
    return this.invoiceService.allSchoolInvoice(user);
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
    @Body() body: InvoiceDto,
  ): Promise<any> {
    const user = req.user as AuthenticatedUser;
    const invoice = await this.invoiceService.getInvoiceById(invoiceId, user);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.invoiceService.updateDiscountInvoice(invoiceId, body, user);
  }
}
