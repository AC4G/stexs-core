import S3 from 'aws-sdk/clients/s3';
import {
	STORAGE_PROTOCOL,
	STORAGE_HOST,
	STORAGE_PORT,
	STORAGE_ACCESS_KEY,
	STORAGE_SECRET_KEY,
} from '../env-config';

const s3 = new S3({
	endpoint: `${STORAGE_PROTOCOL}://${STORAGE_HOST}:${STORAGE_PORT}`,
	s3ForcePathStyle: true,
	credentials: {
		accessKeyId: STORAGE_ACCESS_KEY,
		secretAccessKey: STORAGE_SECRET_KEY,
	},
});

export default s3;
