import logger from '../logger';
import { extractError } from 'utils-node/logger';
import { sendEmail } from '../services/emailSender';
import { emailMessageSchema } from '../schemas/emailSchema';
import type pulsar from 'pulsar-client';
import { ConsumerLoop } from './consumerRegistry';
import pulsarClient from '../pulsar';
import { registerConsumer } from './consumerRegistry';
import { ShutdownController } from '../shutdown';

const EMAIL_TOPIC = 'emails';
const EMAIL_SUBSCRIPTION = 'email-sender';
const EMAIL_DLQ_TOPIC = 'emails-dlq';

function buildEmailConsumerLoop(loop: Omit<ConsumerLoop, 'loopPromise'>): Promise<void> {
  const { consumer, controller, topic, subscription } = loop;

  return (async () => {
    logger.info('Started email consumer loop', { topic, subscription });

    while (!controller.isShuttingDown()) {
      let msg: pulsar.Message | undefined;

      try {
        msg = await consumer.receive();
      } catch {
        continue;
      }

      if (!msg) continue;

      try {
        const content = msg.getData().toString();
        const email = emailMessageSchema.parse(JSON.parse(content));

        await sendEmail(email);
        logger.info('Email sent', { to: email.to, subject: email.subject });

        await consumer.acknowledge(msg);
      } catch (err) {
        logger.error('Failed to process message', {
          error: extractError(err),
          topic,
          subscription
        });
        await consumer.negativeAcknowledge(msg);
      }
    }
  })();
}

export async function setupEmailConsumer(controller: ShutdownController) {
  const emailConsumer = await pulsarClient.subscribe({
    topic: EMAIL_TOPIC,
    subscription: EMAIL_SUBSCRIPTION,
    subscriptionType: 'Shared',
    deadLetterPolicy: {
      maxRedeliverCount: 2,
      deadLetterTopic: EMAIL_DLQ_TOPIC,
    },
  });

  logger.info('Email consumer initialized.');

  const emailLoop = {
    consumer: emailConsumer,
    controller,
    topic: EMAIL_TOPIC,
    subscription: EMAIL_SUBSCRIPTION
  };
  registerConsumer({
    ...emailLoop,
    loopPromise: buildEmailConsumerLoop(emailLoop)
  });
}
