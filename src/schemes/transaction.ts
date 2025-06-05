import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

type TransactionDoc = Transaction & Document;

@Schema({
  collection: 'transaction',
})
class Transaction {
  @Prop({ type: String, index: true })
  invoice_number: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({
    type: String,
    enum: ['buyer', 'seller'],
  })
  paidBy: 'buyer' | 'seller';

  @Prop({
    type: String,
    enum: ['unpaid', 'pending', 'paid'],
    default: 'unpaid',
  })
  paymentStatus: 'unpaid' | 'pending' | 'paid';
}

const TransactionScheme = SchemaFactory.createForClass(Transaction);

export { Transaction, TransactionDoc, TransactionScheme };
