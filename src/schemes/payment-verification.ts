import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

type PaymentVerificationDoc = PaymentVerification & Document;

@Schema({
  collection: 'payment_verification',
})
class PaymentVerification {
  @Prop({ type: String })
  file_name: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String })
  invoiceNumber: string;

  @Prop({ type: String })
  fileUrl: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  verificationStatus: 'pending' | 'approved' | 'rejected';

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;

  @Prop({ type: Types.ObjectId, ref: 'Transaction', index: true })
  transaction: Types.ObjectId;
}

const PaymentVerificationScheme =
  SchemaFactory.createForClass(PaymentVerification);

export {
  PaymentVerification,
  PaymentVerificationDoc,
  PaymentVerificationScheme,
};
