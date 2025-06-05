import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export class ValidatePaymentDto {
  @ApiProperty({ example: 'INVPA-25000080', required: true })
  @IsString()
  invoice_number: string;

  @ApiProperty({ example: 'buyer', enum: ['buyer', 'seller'], required: true })
  @IsEnum(['buyer', 'seller'])
  paidBy: 'buyer' | 'seller';
}
