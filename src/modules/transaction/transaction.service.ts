import { Injectable, HttpStatus } from '@nestjs/common';
import { Transaction, TransactionDoc} from 'src/schemes/transaction';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const vision = require('@google-cloud/vision');

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionDoc: Model<TransactionDoc>,
  ) {}

  public async verificationFile(payload) {
    try {
      console.log('Starting verificationFile with payload:', {
        invoice_number: payload.invoice_number,
        fileSize: payload.file?.size,
      });

      const keyFileContent = Buffer.from(
        process.env.GOOGLE_CREDENTIALS_BASE64,
        'base64',
      ).toString('utf8');
      const credentials = JSON.parse(keyFileContent);

      const client = new vision.ImageAnnotatorClient({ credentials });

      // Cari data transaksi dari DB
      const trxData = await this.transactionDoc.findOne({
        invoice_number: payload.invoice_number,
      });

      if (!trxData) {
        console.error(`Transaction data NOT found for invoice_number: ${payload.invoice_number}`);
        return {
          code: HttpStatus.NOT_FOUND,
          success: false,
          message: 'Transaction data not found',
        };
      }
      console.log('Found transaction data:', trxData);

      // Panggil Google Vision API untuk OCR
      const [result] = await client.textDetection({
        image: { content: payload.file.buffer.toString('base64') },
      });

      console.log('File buffer length:', payload.file.buffer.length);

      if (!result || !result.textAnnotations) {
        console.error('No textAnnotations found from OCR result');
        return {
          code: HttpStatus.BAD_REQUEST,
          success: false,
          message: 'No text found in the image.',
        };
      }

      const detections = result.textAnnotations;
      console.log('OCR detected texts:');
      detections.forEach((el, idx) => {
        console.log(`[${idx}] ${el.description}`);
      });

      let counter = 0;

      const telkomAccount = process.env.TELKOM_ACCOUNT_NUMBER.replace(/\s/g, '');
      const formattedAmount = trxData.amount.toLocaleString('id-ID', { minimumFractionDigits: 2 });
      const normalizedAmount = formattedAmount.replace(/[,.\s]/g, '');

      detections.forEach(element => {
        // Normalisasi teks OCR: hapus koma, titik, spasi
        const detectedTextNormalized = element.description.replace(
          /[,.\s]/g,
          '',
        );

        if (detectedTextNormalized === telkomAccount) {
          counter++;
          console.log(`Matched TELKOM_ACCOUNT_NUMBER in OCR text: ${element.description}`);
          return;
        }

        if (detectedTextNormalized === normalizedAmount) {
          counter++;
          console.log(`Matched amount in OCR text: ${element.description}`);
          return;
        }
      });

      console.log(`Total matched elements count: ${counter}`);

      if (counter >= 2) {
        console.log('Verification success: Data Verified');
        return {
          code: HttpStatus.OK,
          success: true,
          message: 'Data Verified',
        };
      } else {
        console.warn('Verification failed: Data Invalid');
        return {
          code: HttpStatus.BAD_REQUEST,
          success: false,
          message: 'Data Invalid',
        };
      }
    } catch (error) {
      console.error('Error in verificationFile:', error);
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }


  public async getList(payload) {
    const trxData = await this.transactionDoc.find()

    let response = {}
    console.log('trxdata', trxData)
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

  public async getDetail(payload) {
    const trxData = await this.transactionDoc.findOne({
      invoice_number: payload.invoice_number,
    });

    let response = {}
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
}
