import { Injectable, HttpStatus } from '@nestjs/common';
import { Transaction, TransactionDoc } from 'src/schemes/transaction';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { uploadToBucket } from 'src/modules/helper/google-storage.helper';
import { PubsubService } from '../pubsub/pubsub.service';
import vision from '@google-cloud/vision';
import {
  PaymentVerification,
  PaymentVerificationDoc,
} from '../../schemes/payment-verification';

@Injectable()
export class TransactionService {
  private readonly paymentValidatedTopic =
    process.env.PUBSUB_TOPIC_PAYMENT_VALIDATED || 'payment-validated';
  private readonly paymentApprovedTopic =
    process.env.PUBSUB_TOPIC_PAYMENT_APPROVED || 'payment-approved';

  constructor(
    @InjectModel(Transaction.name)
    private transactionDoc: Model<TransactionDoc>,
    @InjectModel(PaymentVerification.name)
    private paymentVerificationDoc: Model<PaymentVerificationDoc>,
    private readonly pubsubService: PubsubService,
  ) {}

  // public async validatePayment(payload: {
  //   invoice_number: string;
  //   paidBy: 'buyer' | 'seller';
  // }) {
  //   const trx = await this.paymentVerificationDoc.findOne({
  //     invoice_number: payload.invoice_number,
  //   });
  //
  //   try {
  //     if (!trx) {
  //       return { success: false, message: 'Transaction not found' };
  //     }
  //
  //     if (trx.paidBy && trx.paidBy === payload.paidBy) {
  //       return {
  //         success: false,
  //         message: `Payment already recorded by ${payload.paidBy}`,
  //       };
  //     }
  //
  //     if (trx.paidBy && trx.paidBy !== payload.paidBy) {
  //       return {
  //         success: false,
  //         message: `Payment already recorded by ${trx.paidBy}`,
  //       };
  //     }
  //
  //     if (trx.paymentStatus === 'paid') {
  //       return {
  //         success: false,
  //         message:
  //           'Transaction is already completed or approved, cannot modify the status.',
  //       };
  //     }
  //
  //     if (payload.paidBy === 'buyer') {
  //       const updateResult = await this.transactionDoc.updateOne(
  //         { invoice_number: payload.invoice_number },
  //         {
  //           $set: {
  //             paidBy: 'buyer',
  //             verificationStatus: 'pending',
  //             paymentStatus: 'pending',
  //           },
  //           $currentDate: { lastUpdated: true },
  //         },
  //       );
  //
  //       if (updateResult.modifiedCount === 0) {
  //         return {
  //           success: false,
  //           message: 'Failed to update transaction status, try again.',
  //         };
  //       }
  //
  //       const response = { success: true, paymentBy: 'buyer' };
  //
  //       try {
  //         await this.pubsubService.publish(this.paymentValidatedTopic, {
  //           invoice_number: payload.invoice_number,
  //           paidBy: 'buyer',
  //         });
  //       } catch (err) {
  //         console.error('Failed to publish payment-validated event', err);
  //       }
  //       return response;
  //     } else if (payload.paidBy === 'seller') {
  //       const updateResult = await this.paymentVerificationDoc.updateOne(
  //         { invoice_number: payload.invoice_number },
  //         {
  //           $set: {
  //             paidBy: 'seller',
  //             paymentStatus: 'approved',
  //             verificationStatus: 'approved',
  //           },
  //           $currentDate: { lastUpdated: true },
  //         },
  //       );
  //
  //       if (updateResult.modifiedCount === 0) {
  //         return {
  //           success: false,
  //           message: 'Failed to update transaction status, try again.',
  //         };
  //       }
  //
  //       const response = { success: true, paymentBy: 'seller' };
  //
  //       try {
  //         await this.pubsubService.publish(this.paymentValidatedTopic, {
  //           invoice_number: payload.invoice_number,
  //           paidBy: 'seller',
  //           paymentStatus: 'approved',
  //         });
  //       } catch (err) {
  //         console.error('Failed to publish payment-validated event', err);
  //       }
  //
  //       return response;
  //     }
  //
  //     return { success: false, message: 'Invalid payment method' };
  //   } catch (error) {
  //     console.error('Unexpected error occurred', error);
  //     return { success: false, message: 'Invalid payment method' };
  //   }
  // }
  //
  // public async approvePayment(payload: { invoice_number: string }) {
  //   const trxData = await this.paymentVerificationDoc.findOne({
  //     invoice_number: payload.invoice_number,
  //   });
  //
  //   if (!trxData) {
  //     return { success: false, message: 'Transaction not found' };
  //   }
  //
  //   if (!trxData.paidBy) {
  //     return {
  //       success: false,
  //       message: 'Payment method not found. Please validate payment first.',
  //     };
  //   }
  //
  //   if (trxData.paidBy !== 'buyer') {
  //     return { success: false, message: 'Approval not required' };
  //   }
  //
  //   const updatedTrx = await this.paymentVerificationDoc.findOneAndUpdate(
  //     { invoice_number: payload.invoice_number },
  //     { $set: { paymentStatus: 'paid', verificationStatus: 'approved' } },
  //     { new: true },
  //   );
  //
  //   const response = { success: true };
  //
  //   this.pubsubService
  //     .publish(this.paymentApprovedTopic, {
  //       invoice_number: payload.invoice_number,
  //       paymentStatus: updatedTrx.paymentStatus,
  //       paidBy: updatedTrx.paidBy,
  //       verificationStatus: updatedTrx.verificationStatus,
  //     })
  //     .catch((err) => {
  //       console.error('Failed to publish payment-approved event', err);
  //     });
  //
  //   return response;
  // }

  // public async verificationFile(payload: any) {
  //   const keyFileContent = Buffer.from(
  //     process.env.GOOGLE_CREDENTIALS_BASE64,
  //     'base64',
  //   ).toString('utf8');
  //   const credentials = JSON.parse(keyFileContent);
  //   const client = new vision.ImageAnnotatorClient({ credentials });
  //
  //   const trxData = await this.transactionDoc.findOne({
  //     invoice_number: payload.invoice_number
  //   });
  //
  //   if (!trxData) {
  //     return {
  //       code: HttpStatus.NOT_FOUND,
  //       success: false,
  //       message: 'Transaction not found',
  //     };
  //   }
  //
  //   // Upload file to bucket
  //   const publicUrl = await uploadToBucket(payload.file, payload.user_id);
  //
  //   const [result] = await client.textDetection({ image: { content: payload.file.buffer.toString('base64') } });
  //   const detections = result.textAnnotations;
  //   let counter = 0;
  //
  //   if (detections && detections.length > 0) {
  //     detections.forEach((element: { description: string }) => {
  //       // Check if the account number matches
  //       if (element.description.includes(process.env.TELKOM_ACCOUNT_NUMBER!)) {
  //         counter++;
  //         return element;
  //       }
  //
  //       // Clean and match amounts
  //       const expectedAmountRaw = trxData.creditAmount.toString().replace(/[^0-9]/g, '') + '00'; // Assuming the '00' is needed for amount
  //       const cleanOCR = element.description.replace(/[^0-9]/g, ''); // Clean the OCR result
  //
  //       if (cleanOCR === expectedAmountRaw) {
  //         counter++;
  //         return element;
  //       }
  //     });
  //   } else {
  //     return {
  //       code: HttpStatus.BAD_REQUEST,
  //       success: false,
  //       message: 'No text found in the image.',
  //     };
  //   }
  //
  //   if (counter >= 2) {
  //     return {
  //       code: HttpStatus.OK,
  //       success: true,
  //       message: 'Data Verified',
  //       file_url: publicUrl
  //     };
  //   } else {
  //     return {
  //       code: HttpStatus.BAD_REQUEST,
  //       success: false,
  //       message: 'Data Invalid',
  //       file_url: publicUrl
  //     };
  //   }
  // }

  public async verificationFile(payload) {
    const keyFileContent = Buffer.from(
      process.env.GOOGLE_CREDENTIALS_BASE64,
      'base64',
    ).toString('utf8');
    const credentials = JSON.parse(keyFileContent);
    const client = new vision.ImageAnnotatorClient({ credentials });

    const trxData = await this.transactionDoc.findOne({
      invoice_number: payload.invoice_number,
    });

    if (!trxData) {
      return {
        code: HttpStatus.NOT_FOUND,
        success: false,
        message: 'Transaction not found',
      };
    }

    // Upload file to bucket
    const publicUrl = await uploadToBucket(payload.file, payload.user_id);

    const [result] = await client.textDetection({
      image: { content: payload.file.buffer.toString('base64') },
    });
    const detections = result.textAnnotations;

    let counter = 0;

    if (detections && detections.length > 0) {
      detections.forEach((element: { description: string }) => {
        if (element.description === process.env.TELKOM_ACCOUNT_NUMBER) {
          counter++;
          return;
        }

        const expectedAmountRaw =
          trxData.amount.toString().replace(/[^0-9]/g, '') + '00';
        const cleanOCR = element.description.replace(/[^0-9]/g, '');

        if (cleanOCR === expectedAmountRaw) {
          counter++;
          return;
        }
      });
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'No text found in the image.',
      };
    }

    if (counter >= 2) {
      const existingPaymentVerification = await this.paymentVerificationDoc.findOne({
        invoiceNumber: payload.invoice_number,
      });

      if (existingPaymentVerification) {
        if (
          existingPaymentVerification.verificationStatus === 'rejected' ||
          existingPaymentVerification.verificationStatus === 'pending'
        ) {
          // Lanjutkan simpan ulang
        } else {
          return {
            code: HttpStatus.CONFLICT,
            success: false,
            message: `Payment verification already exists for this invoice with status: ${existingPaymentVerification.verificationStatus}`,
          };
        }
      }

      const paymentVerification = new this.paymentVerificationDoc({
        file_name: payload.file.originalname,
        amount: trxData.amount,
        invoiceNumber: payload.invoice_number,
        fileUrl: publicUrl,
        transaction: trxData._id,
      });

      await paymentVerification.save();

      return {
        code: HttpStatus.OK,
        success: true,
        message: 'Data Verified and Saved',
        file_url: publicUrl,
      };
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Data Invalid',
        file_url: publicUrl,
      };
    }
  }

  public async getList(payload: {
    status?: 'unpaid' | 'pending' | 'paid';
    paidBy?: 'buyer' | 'seller';
    sellerApprovalStatus?: 'pending' | 'approved' | 'rejected';
  }) {
    const filter: any = {};

    if (payload.status) {
      filter.status = payload.status;
    }

    if (payload.paidBy) {
      filter.paidBy = payload.paidBy;
    }

    if (payload.sellerApprovalStatus) {
      filter.sellerApprovalStatus = payload.sellerApprovalStatus;
    }

    const trxData = await this.transactionDoc.find(filter);

    let response = {};
    // console.log('trxdata', trxData)
    if (trxData) {
      response = {
        code: HttpStatus.OK,
        success: true,
        message: 'success',
        data: trxData,
      };
    } else {
      response = {
        code: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Data Invalid',
      };
    }

    return response;
  }

  public async getDetail(invoice_number: string) {
    const trxData = await this.transactionDoc.findOne({ invoice_number });

    if (trxData) {
      return {
        code: HttpStatus.OK,
        success: true,
        message: 'success',
        data: trxData,
      };
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Data Invalid',
      };
    }
  }
}
