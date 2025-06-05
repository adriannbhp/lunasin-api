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
// import { ApprovePaymentDto } from '../dtos/approve-payment.dto';
// import { ValidatePaymentDto } from '../dtos/validate-payment.dto';

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
  async getList(
    @Query()
    query: {
      status?: 'unpaid' | 'pending' | 'paid';
      paidBy?: 'buyer' | 'seller';
      sellerApprovalStatus?: 'pending' | 'approved' | 'rejected';
    },
    @Res() res: Response,
  ) {
    const result = await this.transactionService.getList(query);

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
  @Post('/validate-payment')
  async validatePayment(
    @Body() body: ValidatePaymentDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.transactionService.validatePayment(body);

      if (!result.success) {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }

      if ('paymentBy' in result && result.paymentBy === 'buyer') {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: 'Payment validated. Awaiting seller approval.',
          approvalRequired: true,
        });
      } else {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: 'Payment validated. No approval required from seller.',
          approvalRequired: false,
        });
      }
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }

  @Post('/approve-payment')
  @ApiOperation({ summary: 'Seller approves the payment' })
   async approvePayment(@Body() body: ApprovePaymentDto, @Res() res: Response) {
     try {
       const approvalResult = await this.transactionService.approvePayment(body);

       if (!approvalResult.success) {
         return res.status(HttpStatus.BAD_REQUEST).json(approvalResult);
       }

       return res.status(HttpStatus.OK).json({
         success: true,
         message: 'Payment approved by seller.',
       });
     } catch (error) {
       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
         success: false,
         message: 'Internal Server Error',
       });
}
