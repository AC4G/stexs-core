import S3 from 'aws-sdk/clients/s3';
import { S3_ENDPOINT } from '../env-config';
import { S3_AVATARS_ACCESS_KEY, S3_AVATARS_SECRET_KEY } from '../env-config';

export const avatarsClient = new S3({
  endpoint: S3_ENDPOINT,
  s3ForcePathStyle: true,
  credentials: {
    accessKeyId: S3_AVATARS_ACCESS_KEY,
    secretAccessKey: S3_AVATARS_SECRET_KEY,
  },
});
