import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

type ValidateDoc = Validate & Document;

@Schema({
  collection: 'validate',
  timestamps: { createdAt: 'uploaded_at', updatedAt: false },
})
class Validate {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  })
  transaction_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  file_name: string;

  @Prop({ type: String, required: true })
  file_url: string;

  @Prop({ type: String, default: null })
  verified_by: string;

  @Prop({ type: Date })
  uploaded_at: Date;
}

const ValidateSchema = SchemaFactory.createForClass(Validate);

export { Validate, ValidateDoc, ValidateSchema };
