import { Router } from 'express';
import { param } from 'express-validator';
import { INVALID_UUID, USER_ID_REQUIRED } from 'utils-node/errors';
import {
	CustomValidationError,
	message
} from '../../utils/messageBuilder';
import s3 from '../../s3';
import logger from '../../logger';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER,
	BUCKET,
	S3_CACHE_CONTROL_EXPIRATION,
	AVATAR_POST_URL_EXPIRATION,
	AVATAR_GET_URL_EXPIRATION,
	AVATAR_SIZE_LIMIT,
} from '../../../env-config';
import { validate as validateUUID } from 'uuid';
import { Request } from 'express-jwt';
import asyncHandler from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validatorMiddleware';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken
} from '../../middlewares/jwtMiddleware';

const router = Router();

router.get(
	'/:userId',
	[
		param('userId')
			.notEmpty()
			.withMessage(USER_ID_REQUIRED)
			.bail()
			.custom((value) => {
				if (!validateUUID(value)) throw new CustomValidationError(INVALID_UUID);

				return true;
			}),
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const { userId } = req.params;

		const expires = AVATAR_GET_URL_EXPIRATION;

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `avatars/${userId}`,
			Expires: expires,
		});

		logger.debug('Generated new presigned url for avatar', { userId });

		return message(
			'Presigned get url generated successfully.',
			{
				url: signedUrl,
				expires: expires
			}
		);
	}),
);

router.post(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger)
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'avatars/' + userId,
				'Content-Type': `image/webp`,
				'Cache-Control': `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`,
				'Content-Disposition': `attachment; filename="${userId}-avatar.webp"`,
			},
			Conditions: [
				['content-length-range', 0, AVATAR_SIZE_LIMIT],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$Cache-Control', `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`],
				['eq', '$key', 'avatars/' + userId],
				['eq', '$Content-Disposition', `attachment; filename="${userId}-avatar.webp"`]
			],
			Expires: AVATAR_POST_URL_EXPIRATION,
		});

		logger.debug('Generated signed post url for avatar', { userId });

		return message(
			'Presigned post url generated successfully.',
			{ ...signedPost }
		);
	}),
);

router.delete(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const userId = req.auth?.sub!;

		await s3
			.deleteObjects({
				Bucket: BUCKET,
				Delete: {
					Objects: [{ Key: 'avatars/' + userId }],
				},
			})
			.promise();

		logger.debug('Deleted avatar', { userId });

		return 204;
	}),
);

export default router;
