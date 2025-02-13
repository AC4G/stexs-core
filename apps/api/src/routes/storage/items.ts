import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	ISSUER,
} from '../../../env-config';
import { Router, Response } from 'express';
import {
	validate,
	checkScopes,
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
} from 'utils-node/middlewares';
import logger from '../../logger';
import { Request } from 'express-jwt';
import db from '../../db';
import { message } from 'utils-node/messageBuilder';
import {
	INTERNAL_ERROR,
	ITEM_ID_NOT_NUMERIC,
	ITEM_ID_REQUIRED,
	UNAUTHORIZED_ACCESS,
} from 'utils-node/errors';
import s3 from '../../s3';
import { param } from 'express-validator';
import { isUserAdminOrOwnerOfProjectByItemId } from '../../repositories/public/projectMembers';
import { isClientAllowedToAccessProjectByItemId } from '~/repositories/public/items';

const router = Router();

router.get(
	'/thumbnail/:itemId',
	[
		param('itemId')
			.notEmpty()
			.withMessage(ITEM_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ITEM_ID_NOT_NUMERIC),
		validate(logger),
	],
	async (req: Request, res: Response) => {
		const { itemId } = req.params;

		const time = 60 * 60 * 24; // 1 day

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `items/thumbnails/${itemId}`,
			Expires: time,
		});

		logger.debug(`Generated new presigned url for item thumbnail: ${itemId}`);

		return res.json(message('Presigned get url generated successfully.', {
			url: signedUrl,
		}));
	},
);

router.post(
	'/thumbnail/:itemId',
	[
		param('itemId')
			.notEmpty()
			.withMessage(ITEM_ID_REQUIRED)
			.bail()
			.isNumeric()
			.withMessage(ITEM_ID_NOT_NUMERIC),
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['item.thumbnail.write'], db, logger),
		transformJwtErrorMessages(logger),
	],
	async (req: Request, res: Response) => {
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

		try {
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

				logger.debug(`${consumer} is not authorized to upload/update the thumbnail of an item: ${itemId}. ${consumer}: ${consumerId}`);

				return res
					.status(401)
					.json(
						message(
							'Unauthorized access to upload/update the thumbnail of an item.',
							{},
							[{ info: UNAUTHORIZED_ACCESS }]
						)
					);
			}
		} catch (e) {
			logger.error(
				`Error while checking the current user if authorized for uploading/updating item thumbnail. Error: ${
					e instanceof Error ? e.message : e
				}`,
			);
			return res
				.status(500)
				.json(
					message(
						'An unexpected error occurred while checking authorization.',
						{},
						[{ info: INTERNAL_ERROR }]
					)
				);
		}

		const cacheExpires = 60 * 60 * 24 * 7; // 1 week

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'items/thumbnails/' + itemId,
				'Cache-Control': `private, max-age=${cacheExpires}, must-revalidate`,
				'Content-Type': `image/webp`,
				'Content-Disposition': `attachment; filename="item-${itemId}-thumbnail.webp"`,
			},
			Conditions: [
				['content-length-range', 0, 1024 * 1024], // 1MB
				['eq', '$Cache-Control', `private, max-age=${cacheExpires}, must-revalidate`],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$key', 'items/thumbnails/' + itemId],
				['eq', '$Content-Disposition', `attachment; filename="item-${itemId}-thumbnail.webp"`]
			],
			Expires: 60 * 5, // 5 minutes
		});

		logger.debug(`Created new presigned post url for item thumbnail: ${itemId}`);

		return res.json(message('Presigned post url generated successfully.', { ...signedPost }));
	},
);

export default router;
