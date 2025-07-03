import {
  PULSAR_CERT_PATH,
  PULSAR_PRIVATE_KEY_PATH,
  PULSAR_URL
} from '../env-config';
import pulsar from 'pulsar-client';

const authentication = PULSAR_CERT_PATH && PULSAR_PRIVATE_KEY_PATH ? new pulsar.AuthenticationTls({
  certificatePath: PULSAR_CERT_PATH,
  privateKeyPath: PULSAR_PRIVATE_KEY_PATH,
}) : undefined;

const client = new pulsar.Client({ serviceUrl: PULSAR_URL, authentication });

export default client;
