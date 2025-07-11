import type pulsar from 'pulsar-client';
import { ShutdownController } from '../shutdown';

export type ConsumerLoop = {
  consumer: pulsar.Consumer;
  loopPromise: Promise<void>;
  topic: string;
  subscription: string;
  controller: ShutdownController;
};

const consumers: ConsumerLoop[] = [];

export function registerConsumer(loop: ConsumerLoop) {
  consumers.push(loop);
}

export function getRegisteredConsumers(): ConsumerLoop[] {
  return consumers;
}
