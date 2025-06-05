import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PubSub, Subscription } from '@google-cloud/pubsub';

@Injectable()
export class PubsubService implements OnModuleInit {
  private readonly logger = new Logger(PubsubService.name);
  private pubSubClient: PubSub;

  constructor() {
    this.pubSubClient = new PubSub({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString(),
      ),
    });
  }

  // Publish method sama seperti sebelumnya
  async publish(topicName: string, data: object): Promise<void> {
    try {
      const dataBuffer = Buffer.from(JSON.stringify(data));
      const messageId = await this.pubSubClient
        .topic(topicName)
        .publishMessage({ data: dataBuffer });
      this.logger.log(`Message ${messageId} published to topic ${topicName}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish message to topic ${topicName}`,
        error,
      );
      throw error;
    }
  }

  // Implementasi subscriber, jalankan listen di onModuleInit
  onModuleInit() {
    const subscriptionNameValidated =
      process.env.PUBSUB_SUBSCRIPTION_PAYMENT_VALIDATED;
    const subscriptionNameApproved =
      process.env.PUBSUB_SUBSCRIPTION_PAYMENT_APPROVED;

    if (subscriptionNameValidated) {
      this.listenSubscription(subscriptionNameValidated, 'payment-validated');
    }

    if (subscriptionNameApproved) {
      this.listenSubscription(subscriptionNameApproved, 'payment-approved');
    }
  }

  // Contoh method notifikasi sementara
  private async sendNotificationSimple(payload: {
    userType: 'buyer' | 'seller';
    invoiceNumber: string;
    title: string;
    message: string;
  }): Promise<void> {
    // Misalnya notifikasi sementara hanya log ke console
    this.logger.log(
      `Sending notification to ${payload.userType}: [${payload.title}] ${payload.message}`,
    );

    // Simulasi delay async (misal kirim ke FCM, WebSocket, dsb)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private listenSubscription(subscriptionName: string, topicLabel: string) {
    const subscription: Subscription =
      this.pubSubClient.subscription(subscriptionName);

    subscription.on('message', async (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        this.logger.log(`Received ${topicLabel} message: ${JSON.stringify(data)}`);

        const userType = data.paidBy ?? 'unknown'; // 'buyer' atau 'seller'
        const invoiceNumber = data.invoice_number ?? 'unknown';

        // Buat pesan notifikasi beda berdasarkan siapa yang bayar
        const title = 'Payment Update';
        let messageText = '';

        if (userType === 'buyer') {
          messageText = `Buyer has made a payment for invoice ${invoiceNumber}. Awaiting seller approval.`;
        } else if (userType === 'seller') {
          messageText = `Seller has completed payment for invoice ${invoiceNumber}. Payment approved.`;
        } else {
          messageText = `Payment status updated for invoice ${invoiceNumber}.`;
        }

        await this.sendNotificationSimple({
          userType,
          invoiceNumber,
          title,
          message: messageText,
        });

        message.ack();
      } catch (error) {
        this.logger.error(`Error processing ${topicLabel} message`, error);
      }
    });

    this.logger.log(
      `Listening on subscription: ${subscriptionName} for topic: ${topicLabel}`,
    );
  }
}
