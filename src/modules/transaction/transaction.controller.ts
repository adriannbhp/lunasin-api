import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionService } from './transaction.service';
import { Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadBodyDto } from '../dtos/upload-body.dto';

@ApiTags('Transaction')
@Controller()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('/upload')
  @ApiOperation({ summary: 'Upload invoice image and verify via OCR' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload an image file with invoice number',
    type: UploadBodyDto,
  })
  @ApiResponse({ status: 200, description: 'Verification success' })
  @ApiResponse({ status: 400, description: 'Bad request or file not uploaded' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadBodyDto,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No image file uploaded or file type not allowed.',
      });
    }

    const result = await this.transactionService.verificationFile({
      file: file,
      ...body,
    });

    if (result) {
      return res.status(result['code']).json({
        success: result['success'],
        message: result['message'],
      });
    }
  }

  @Get('/list')
  @ApiOperation({ summary: 'Get all transaction records' })
  @ApiResponse({ status: 200, description: 'List retrieved' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'Menunggu Pembayaran',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    example: 'PT Telkom Indonesia',
  })
  async getList(@Query() query: any, @Res() res: Response) {
    const result = await this.transactionService.getList(query);

    return res.status(result.code).json({
      success: result.success,
      message: result.message,
      data: result.data ?? [],
    });
  }

  @Get('/detail')
  @ApiOperation({ summary: 'Get transaction detail by invoice number' })
  @ApiQuery({ name: 'invoice_number', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Detail retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getDetail(
    @Query('invoice_number') invoice_number: string,
    @Res() res: Response,
  ) {
    const result = await this.transactionService.getDetail(invoice_number);

    if (result) {
      return res.status(result['code']).json({
        success: result['success'],
        message: result['message'],
        data: result['data'] ?? {},
      });
    }
  }
}
