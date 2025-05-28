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
  UploadedFiles
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { TransactionService } from './transaction.service';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UploadBodyDto } from "../dtos/upload-body.dto";


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

  @Post('/upload/batch')
  @ApiOperation({ summary: 'Batch upload invoice images and verify via OCR' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
        image: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })

  @Post('/upload/batch')
  @UseInterceptors(FilesInterceptor('image'))
  async uploadFilesBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadBodyDto,
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No image files uploaded.',
      });
    }

    const results = [];

    for (const file of files) {
      const result = await this.transactionService.verificationFileBatch({
        file: file,
        ...body,
      });

      results.push(result);
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Batch verification completed',
      results,
    });
  }



  @Get('/list')
  @ApiOperation({ summary: 'Get all transaction records' })
  @ApiResponse({ status: 200, description: 'List retrieved' })
  async getList(@Query() query: any, @Res() res: Response) {
    const result = await this.transactionService.getList({});

    if (result) {
      return res.status(result['code']).json({
        success: result['success'],
        message: result['message'],
        data: result['data'] ?? [],
      });
    }
  }

  @Get('/detail')
  @ApiOperation({ summary: 'Get transaction detail by invoice number' })
  @ApiQuery({ name: 'invoice_number', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Detail retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getDetail(@Query('invoice_number') invoice_number: string, @Res() res: Response) {
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