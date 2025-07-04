import { createPulsarClient } from 'utils-node';
import {
  PULSAR_CERT_PATH,
  PULSAR_PRIVATE_KEY_PATH,
  PULSAR_URL
} from '../env-config';

const client = createPulsarClient({
  serviceUrl: PULSAR_URL,
  certificatePath: PULSAR_CERT_PATH,
  privateKeyPath: PULSAR_PRIVATE_KEY_PATH,
});

export default client;
