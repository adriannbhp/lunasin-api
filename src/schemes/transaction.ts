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
  @Prop({ type: String })
  status: string;
}

const TransactionScheme = SchemaFactory.createForClass(Transaction);

export { Transaction, TransactionDoc, TransactionScheme };
