import pulsar from 'pulsar-client';
import pulsarClient from '../pulsar';
import logger from '../logger';
import { extractError } from 'utils-node/logger';
import { sendEmail } from '../services/emailSender';
import { emailMessageSchema, type EmailMessage } from '../schemas/emailSchema';

const EMAIL_TOPIC = 'emails';
const EMAIL_SUBSCRIPTION = 'email-sender';
const EMAIL_DLQ_TOPIC = 'emails-dlq';
const EMAIL_DLQ_SUBSCRIPTION = 'email-dlq-processor';

export async function startEmailConsumer(
  controller: { shuttingDown: boolean }
): Promise<{ consumer: pulsar.Consumer; loopPromise: Promise<void> }> {
  const consumer = await pulsarClient.subscribe({
    topic: EMAIL_TOPIC,
    subscription: EMAIL_SUBSCRIPTION,
    subscriptionType: 'Shared',
    deadLetterPolicy: {
      maxRedeliverCount: 3,
      deadLetterTopic: EMAIL_DLQ_TOPIC,
    }
  });

  logger.info('Email consumer started, waiting for messages...');

  const loopPromise = (async () => {
    while (!controller.shuttingDown) {
      let msg: pulsar.Message | undefined;

      try {
        msg = await consumer.receive();
      } catch (err) {
        continue;
      }

      if (!msg) continue;

      try {
        const messageContent = msg.getData().toString();
        const parsed = JSON.parse(messageContent);
        const emailData: EmailMessage = emailMessageSchema.parse(parsed);

        await sendEmail(emailData);

        logger.info('Email sent successfully', { to: emailData.to, subject: emailData.subject });
        await consumer.acknowledge(msg);
      } catch (err) {
        logger.error('Failed to process message or send email', { error: extractError(err) });
        await consumer.negativeAcknowledge(msg);
      }
    }
  })();

  return { consumer, loopPromise };
}

export async function startEmailDlqConsumer(
  controller: { shuttingDown: boolean }
): Promise<{ consumer: pulsar.Consumer; loopPromise: Promise<void> }> {
  const consumer = await pulsarClient.subscribe({
    topic: EMAIL_DLQ_TOPIC,
    subscription: EMAIL_DLQ_SUBSCRIPTION,
    subscriptionType: 'Shared',
  });

  logger.info('Email DLQ consumer started, waiting for messages...');

  const loopPromise = (async () => {
    while (!controller.shuttingDown) {
      let msg: pulsar.Message | undefined;

      try {
        msg = await consumer.receive();
      } catch (err) {
        continue;
      }
      
      if (!msg) continue;

      try {
        const messageContent = msg.getData().toString();
        const parsed = JSON.parse(messageContent);
        const emailData: EmailMessage = emailMessageSchema.parse(parsed);

        await sendEmail(emailData);

        await consumer.acknowledge(msg);
      } catch (err) {
        logger.error('Failed to process DLQ message', { error: extractError(err) });
        await consumer.negativeAcknowledge(msg);
      }
    }
  })();

  return { consumer, loopPromise };
}
