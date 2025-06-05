import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress, Response } from 'express';


@Controller('invoice')
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) {}

    @Post('generate')
    @UseGuards(JwtAuthGuard)
    async generateInvoice(@Body() body: InvoiceDto, @Request() req: RequestExpress): Promise<any> {
            const user = req.user as AuthenticatedUser;
        
        return this.invoiceService.generateInvoice(body, user);
    }
}
