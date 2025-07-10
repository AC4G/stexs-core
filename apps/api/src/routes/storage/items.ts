import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	S3_CACHE_CONTROL_EXPIRATION,
	ISSUER,
	ITEM_THUMBNAIL_GET_URL_EXPIRATION,
	ITEM_THUMBNAIL_POST_URL_EXPIRATION,
	ITEM_THUMBNAIL_SIZE_LIMIT,
} from '../../../env-config';
import { Router } from 'express';
import logger from '../../logger';
import { Request } from 'express-jwt';
import db from '../../db';
import { message } from '../../utils/messageBuilder';
import { UNAUTHORIZED_ACCESS } from 'utils-node/errors';
import s3 from '../../s3';
import { isUserAdminOrOwnerOfProjectByItemId } from '../../repositories/public/projectMembers';
import { isClientAllowedToAccessProjectByItemId } from '../../repositories/public/items';
import { itemIdQueryValidator } from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { validate } from '../../middlewares/validatorMiddleware';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken
} from '../../middlewares/jwtMiddleware';
import { checkScopes } from '../../middlewares/scopesMiddleware';

const router = Router();

router.get(
	'/thumbnail/:itemId',
	[
		itemIdQueryValidator,
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const { itemId } = req.params;

		const expires = ITEM_THUMBNAIL_GET_URL_EXPIRATION;

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `items/thumbnails/${itemId}`,
			Expires: expires,
		});

		logger.debug('Generated new presigned url for item thumbnail', { itemId });

		return message(
			'Presigned get url generated successfully.',
			{
				url: signedUrl,
				expires: expires,
			}
		);
	}),
);

router.post(
	'/thumbnail/:itemId',
	[
		itemIdQueryValidator,
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['item.thumbnail.write'], db, logger),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const sub = req.auth?.sub!;
		const { itemId } = req.params;
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationId,
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		let isAllowed = false;

		if (grantType === 'password') {
			const { rowCount } = await isUserAdminOrOwnerOfProjectByItemId(sub, Number(itemId));

			if (rowCount === 1) isAllowed = true;
		} else {
			const { rowCount } = await isClientAllowedToAccessProjectByItemId(
				Number(itemId),
				organizationId,
				clientId
			)

			if (rowCount === 1) isAllowed = true;
		}

		if (!isAllowed) {
			const consumer = grantType === 'password' ? 'User' : 'Client';
			const consumerId = grantType === 'password' ? sub : clientId;

			throw new AppError({
				status: 401,
				message: 'Unauthorized access to upload/update the thumbnail of an item.',
				errors: [{ info: UNAUTHORIZED_ACCESS }],
				log: {
					level: 'debug',
					message: 'Unauthorized access to upload/update the thumbnail of an item',
					meta: {
						consumer,
						consumerId,
						itemId
					},
				},
			});
		}

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'items/thumbnails/' + itemId,
				'Cache-Control': `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`,
				'Content-Type': `image/webp`,
				'Content-Disposition': `attachment; filename="item-${itemId}-thumbnail.webp"`,
			},
			Conditions: [
				['content-length-range', 0, ITEM_THUMBNAIL_SIZE_LIMIT],
				['eq', '$Cache-Control', `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$key', 'items/thumbnails/' + itemId],
				['eq', '$Content-Disposition', `attachment; filename="item-${itemId}-thumbnail.webp"`]
			],
			Expires: ITEM_THUMBNAIL_POST_URL_EXPIRATION,
		});

		logger.debug('Created new presigned post url for item thumbnail', { itemId });

		return message(
			'Presigned post url generated successfully.',
			{ ...signedPost }
		);
	}),
);

export default router;
