import { ApiProperty } from '@nestjs/swagger';

export class UploadBodyDto {
  @ApiProperty({ example: 'INVPA-25000080', required: true })
  invoice_number: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  image: any;
}
