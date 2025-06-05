import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionScheme } from '../../schemes/transaction'; // Import Transaction model and schema
import { PaymentVerification, PaymentVerificationScheme } from '../../schemes/payment-verification';
import { PubsubModule } from '../pubsub/pubsub.module';
import { PubsubService } from '../pubsub/pubsub.service';

@Module({
  imports: [
    PubsubModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionScheme },
      { name: PaymentVerification.name, schema: PaymentVerificationScheme },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionpModule {}
