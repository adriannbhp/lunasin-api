import { Controller, Get, Post, Query, Body, UploadedFile, UseInterceptors, Res, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionService } from './transaction.service';
import { Response } from 'express';

interface UploadBodyDto {
  invoice_number?: string;
}

@Controller() 
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

@Post('/upload')
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
        ...body
    });

    if (result) {
      return res.status(result['code']).json({
        success: result['success'],
        message: result['message']
      })
    }
  }

@Get('/list')
  async getList(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const result = await this.transactionService.getList({})

    if (result) {
      return res.status(result['code']).json({
        success: result['success'],
        message: result['message'],
        data: result['data'] ?? []
      })
    }
  }

@Get('/detail')
  async getDetail(
    @Query() invoice_number: string,
    @Res() res: Response,
  ) {
    const result = await this.transactionService.getDetail(invoice_number);

    if (result) {
      return res.status(result['code']).json({
        success: result['success'],
        message: result['message'],
        data: result['data'] ?? {}
      })
    }
  }
}