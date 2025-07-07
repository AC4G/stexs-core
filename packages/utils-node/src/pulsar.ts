import pulsar from 'pulsar-client';

export function createPulsarClient({
  serviceUrl,
  certificatePath,
  privateKeyPath,
}: {
  serviceUrl: string;
  certificatePath?: string;
  privateKeyPath?: string;
}) {
  const authentication =
    certificatePath && privateKeyPath
      ? new pulsar.AuthenticationTls({
          certificatePath,
          privateKeyPath,
        })
      : undefined;

  const client = new pulsar.Client({
    serviceUrl,
    authentication,
  });

  return client;
}
