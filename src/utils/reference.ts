import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilityService {
  constructor(private prisma: PrismaService) {}
}

// export const = generateUniqueReferenceNumber(): Promise<string> => {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//     const length = 10;
//     const maxAttempts = 10; // Prevent infinite loops
//     let attempts = 0;

//     while (attempts < maxAttempts) {
//       let reference = '';
//       const bytes = crypto.randomBytes(length);
//       for (let i = 0; i < length; i++) {
//         const randomIndex = bytes[i] % characters.length;
//         reference += characters[randomIndex];
//       }

//       // Check if reference already exists
//       const existingInvoice = await this.prisma.invoice.findFirst({
//         where: { reference },
//       });

//       if (!existingInvoice) {
//         return reference; // Unique reference found
//       }

//       attempts++;
//     }

//     throw new Error('Failed to generate a unique reference number after maximum attempts');
//   }

export const generateInvoiceReference = () => {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const allChars = letters + digits;

  let password = '';
  for (let i = 0; i < 6; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return password;
};

// Example usage
