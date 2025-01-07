import { Router, Response } from 'express';
import { param } from 'express-validator';
import {
	INTERNAL_ERROR,
	INVALID_UUID, 
	USER_ID_REQUIRED,
} from 'utils-node/errors';
import {
	CustomValidationError,
	message
} from 'utils-node/messageBuilder';
import { 
	validate,
	validateAccessToken,
	checkTokenGrantType,
	transformJwtErrorMessages,
} from 'utils-node/middlewares';
import s3 from '../../s3';
import logger from '../../loggers/logger';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	ISSUER,
	BUCKET,
} from '../../../env-config';
import { validate as validateUUID } from 'uuid';
import { Request } from 'express-jwt';

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
	async (req: Request, res: Response) => {
		const { userId } = req.params;
		const expires = 60 * 60 * 24; // 1 day

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `avatars/${userId}`,
			Expires: expires,
		});

		logger.debug(`Generated new presigned url for avatar: ${userId}`);

		return res.json(message('Presigned get url generated successfully.', {
			url: signedUrl,
		}));
	},
);

router.post(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger)
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;
		const cacheExpires = 60 * 60 * 24 * 7; // 1 week

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'avatars/' + userId,
				'Content-Type': `image/webp`,
				'Cache-Control': `private, max-age=${cacheExpires}, must-revalidate`,
				'Content-Disposition': `attachment; filename="${userId}-avatar.webp"`,
			},
			Conditions: [
				['content-length-range', 0, 1024 * 1024], // 1MB
				['eq', '$Content-Type', `image/webp`],
				['eq', '$Cache-Control', `private, max-age=${cacheExpires}, must-revalidate`],
				['eq', '$key', 'avatars/' + userId],
				['eq', '$Content-Disposition', `attachment; filename="${userId}-avatar.webp"`]
			],
			Expires: 60, // 10 seconds,
		});

		logger.debug(`Generated signed post url for avatar: ${userId}`);

		return res.json(message('Presigned post url generated successfully.', { ...signedPost }));
	},
);

router.delete(
	'/',
	[
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password']),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
		const userId = req.auth?.sub!;

		try {
			await s3
				.deleteObjects({
					Bucket: BUCKET,
					Delete: {
						Objects: [{ Key: 'avatars/' + userId }],
					},
				})
				.promise();

			logger.debug(`Deleted avatar from user: ${userId}`);
		} catch (e) {
			logger.error(
				`Error while deleting avatar. Error: ${e instanceof Error ? e.message : e}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while deleting avatar.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		return res.sendStatus(204);
	},
);

export default router;
