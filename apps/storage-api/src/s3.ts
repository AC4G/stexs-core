import S3 from 'aws-sdk/clients/s3';
import {
	STORAGE_ENDPOINT,
	STORAGE_ACCESS_KEY,
	STORAGE_SECRET_KEY,
} from '../env-config';

const s3 = new S3({
	endpoint: STORAGE_ENDPOINT,
	s3ForcePathStyle: true,
	credentials: {
		accessKeyId: STORAGE_ACCESS_KEY,
		secretAccessKey: STORAGE_SECRET_KEY,
	},
});

export default s3;
