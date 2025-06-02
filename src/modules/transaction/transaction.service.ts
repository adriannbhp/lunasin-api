import { Injectable, HttpStatus } from '@nestjs/common';
import { Transaction, TransactionDoc} from 'src/schemes/transaction';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const vision = require('@google-cloud/vision');

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionDoc:Model<TransactionDoc>
  ) {}

  // g
  public async verificationFile(payload) {
    const keyFileContent = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    const credentials = JSON.parse(keyFileContent);
    const client = new vision.ImageAnnotatorClient({ credentials });

    const trxData = await this.transactionDoc.findOne({
      invoice_number: payload.invoice_number
    });

    if (!trxData) {
      return {
        code: HttpStatus.NOT_FOUND,
        success: false,
        message: 'Transaction not found',
      };
    }

    const [result] = await client.textDetection({ image: { content: payload.file.buffer.toString('base64') } });
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
      return {
        code: HttpStatus.OK,
        success: true,
        message: 'Data Verified',
      };
    } else {
      return {
        code: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Data Invalid',
      };
    }
  }


  public async verificationFileBatch(payload: { file: Express.Multer.File, invoice_number: string }) {
    const keyFileContent = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    const credentials = JSON.parse(keyFileContent);
    const client = new vision.ImageAnnotatorClient({ credentials });

    const trxData = await this.transactionDoc.findOne({ invoice_number: payload.invoice_number });

    if (!trxData) {
      return {
        success: false,
        message: 'Invoice not found',
        filename: payload.file.originalname,
      };
    }

    const [result] = await client.textDetection({
      image: { content: payload.file.buffer.toString('base64') },
    });

    let counter = 0;
    const detections = result.textAnnotations;
    if (detections && detections.length > 0) {
      for (const element of detections) {
        const text = element.description;
        const expectedAmountRaw = trxData.amount.toString().replace(/[^0-9]/g, '') + '00';
        const cleanOCR = text.replace(/[^0-9]/g, '');

        if (text === process.env.TELKOM_ACCOUNT_NUMBER) counter++;
        if (cleanOCR === expectedAmountRaw) counter++;

        if (counter >= 2) break;
      }
    }

    return {
      success: counter >= 2,
      message: counter >= 2 ? 'Data Verified' : 'Data Invalid',
      filename: payload.file.originalname,
    };
  }

  public async getList(payload) {
    const trxData = await this.transactionDoc.find();

    let response = {}
    // console.log('trxdata', trxData)
    if (trxData) {
      response = {
        code: HttpStatus.OK,
        success: true,
        message: 'success',
        data: trxData
      }
    } else {
      response = {
        code: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Data Invalid'
      }
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
