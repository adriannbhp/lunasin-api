import { Injectable, HttpStatus } from '@nestjs/common';
import { Transaction, TransactionDoc } from 'src/schemes/transaction';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { uploadToBucket } from 'src/modules/helper/google-storage.helper';
import { v4 as uuidv4 } from 'uuid';

import vision from '@google-cloud/vision';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionDoc: Model<TransactionDoc>,
  ) {}

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
    const fileExt = payload.file.originalname.split('.').pop();
    const fileName = `${payload.invoice_number}-${uuidv4()}.${fileExt}`;
    const publicUrl = await uploadToBucket(payload.file, fileName);

    const [result] = await client.textDetection({
      image: { content: payload.file.buffer.toString('base64') },
    });
    const detections = result.textAnnotations;
    let counter = 0;

    if (detections && detections.length > 0) {
      detections.forEach((element: { description: string }) => {
        if (element.description === process.env.TELKOM_ACCOUNT_NUMBER) {
          counter++;
          return element;
        }

        const expectedAmountRaw =
          trxData.amount.toString().replace(/[^0-9]/g, '') + '00';
        const cleanOCR = element.description.replace(/[^0-9]/g, '');

        if (cleanOCR === expectedAmountRaw) {
          counter++;
          return element;
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
      await this.transactionDoc.findOneAndUpdate(
        { invoice_number: payload.invoice_number },
        {
          $set: {
            status: 'Pembayaran Terverifikasi',
            updated_at: new Date(),
          },
        },
        { new: true },
      );
      return {
        code: HttpStatus.OK,
        success: true,
        message: 'Data Verified',
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

  public async getList(payload: any) {
    const trxData = await this.transactionDoc.find();

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
