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

  public async verificationFile(payload) {
    const keyFileContent = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    const credentials = JSON.parse(keyFileContent);
    const client = new vision.ImageAnnotatorClient({ credentials });
    const trxData = await this.transactionDoc.findOne({
      invoice_number: payload.invoice_number
    })
    const [result] = await client.textDetection({ image: { content: payload.file.buffer.toString('base64') } });
    const detections = result.textAnnotations;
    let counter = 0;

    if (detections && detections.length > 0) {
      detections.forEach(element => {
        if (element.description === process.env.TELKOM_ACCOUNT_NUMBER) {
          counter++;
          return element;
        }
        const formattedAmount = trxData.amount.toLocaleString()
        if (element.description === formattedAmount+'.00') {
          counter++;
          return element;
        }
      });
    } else {
      return 'No text found in the image.';
    }

    let response = {}
    if (counter >= 2) {
      response = {
        code: HttpStatus.OK,
        success: true,
        message: 'Data Verified'
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

  public async getList(payload) {
    const trxData = await this.transactionDoc.find()

    let response = {}
    console.log('trxdata', trxData)
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

  public async getDetail(payload) {
    const trxData = await this.transactionDoc.findOne({
      invoice_number: payload.invoice_number
    })

    let response = {}
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
}