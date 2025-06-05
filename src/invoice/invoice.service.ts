import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceDto } from './dto/invoice.dto';
import { AuthenticatedUser } from '@/types/express';
import { UtilityService } from '@/utils/reference';

@Injectable()
export class InvoiceService {
    constructor(private prisma: PrismaService,
        // private utilityService: UtilityService,
    ) {}

    async generateInvoice(body: InvoiceDto, user: AuthenticatedUser): Promise<any> {
        const schoolId = user.schoolId;
        const { studentId, amount, classId, description, title, classArmId } = body;
        // const reference = await this.utilityService.generateUniqueReferenceNumber(); // Use unique reference
        try {
          const createInvoice = await this.prisma.invoice.create({
            data: {
              amount,
              description,
              title,
              student: studentId ? { connect: { id: studentId } } : undefined, // Optional relation
              class: { connect: { id: classId } },
              classArm: { connect: { id: classArmId } },
              school: { connect: { id: schoolId } },
              issuedDate: new Date(),
              reference: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Simple unique reference generation
            },
          });
          return createInvoice;
        } catch (error) {
          throw new HttpException('Failed to generate invoice', 500);
        }
      }

    async getInvoiceById(id: string): Promise<any> {
        try {
            const invoice = await this.prisma.invoice.findUnique({
                where:{id}
            })
            if (!invoice) {
                throw new NotFoundException("Invoice not found");
            }
            return invoice
      
        } catch (error) {
            throw new HttpException(`Error fetching invoice with ${id}`, 500)
        }
    }

    async findAll(){
        try {
            const invoice = await this.prisma.invoice.findMany({select:
                {school: true, student: true, class: true, classArm: true}})
            return invoice;      
        } catch (error) {
            throw new HttpException("Failed to fetch invoice", 500)   
        }
    }
}
