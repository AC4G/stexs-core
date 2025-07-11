import { Producer } from 'pulsar-client';
import pulsarClient from '../pulsar';
import { emailMessageSchema } from '../schemas/emailSchema';
import type { EmailMessage } from '../schemas/emailSchema';
import logger from '../logger';

const EmailProducerManager = (() => {
  let emailProducer: Producer | null = null;

  async function init() {
    emailProducer = await pulsarClient.createProducer({ topic: 'emails' });
    logger.info('Email producer initialized.');
  }

  async function send(message: EmailMessage) {
    if (!emailProducer) {
      throw new Error('Email producer not initialized');
    }

    const validated = emailMessageSchema.parse(message);
    const data = Buffer.from(JSON.stringify(validated));
    await emailProducer.send({ data });
  }

  async function close() {
    if (emailProducer) {
      await emailProducer.close();
      logger.info('Email producer closed.');
    }
  }

  return {
    init,
    send,
    close,
  };
})();

export const initEmailProducer = EmailProducerManager.init;
export const sendEmailMessage = EmailProducerManager.send;
export const closeEmailProducer = EmailProducerManager.close;
