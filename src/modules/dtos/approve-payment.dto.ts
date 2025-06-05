import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ApprovePaymentDto {
  @ApiProperty({ example: 'INVPA-25000080', required: true })
  @IsString()
  invoice_number: string;
}
