import { Router } from 'express';
import logger from '../../logger';
import { Request } from 'express-jwt';
import { UNAUTHORIZED_ACCESS } from 'utils-node/errors';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	ISSUER,
	ORGANIZATION_LOGO_GET_URL_EXPIRATION,
	ORGANIZATION_LOGO_POST_URL_EXPIRATION,
	ORGANIZATION_LOGO_SIZE_LIMIT,
	S3_CACHE_CONTROL_EXPIRATION,
} from '../../../env-config';
import db from '../../db';
import { message } from '../../utils/messageBuilder';
import s3 from '../../s3';
import { isUserAdminOrOwnerOfOrganization } from '../../repositories/public/organizationMembers';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { validate, organizationIdQueryValidator } from '../../middlewares/validatorMiddleware';
import {
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken
} from '../../middlewares/jwtMiddleware';
import { checkScopes } from '../../middlewares/scopesMiddleware';

const router = Router();

router.get(
	'/:organizationId',
	[
		organizationIdQueryValidator,
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const { organizationId } = req.params;

		const expires = ORGANIZATION_LOGO_GET_URL_EXPIRATION;

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `organizations/${organizationId}`,
			Expires: expires,
		});

		logger.debug('Generated new presigned url for organization logo', { organizationId });

		return message(
			'Presigned url generated successfully.',
			{
				url: signedUrl,
				expires
			}
		);
	}),
);

router.post(
	'/:organizationId',
	[
		organizationIdQueryValidator,
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['organization.logo.write'], db, logger),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const sub = req.auth?.sub!;
		const organizationId = parseInt(req.params.organizationId);
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationIdFromToken,
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		let isAllowed = false;

		if (grantType === 'password') {
			const { rowCount } = await isUserAdminOrOwnerOfOrganization(sub, organizationId);

			if (rowCount === 1) isAllowed = true;
		} 
		
		if (organizationId === organizationIdFromToken) {
			isAllowed = true;
		}

		if (!isAllowed) {
			const consumer = grantType === 'password' ? 'User' : 'Client';
			const consumerId = grantType === 'password' ? sub : clientId;

			throw new AppError({
				status: 401,
				message: 'Unauthorized access to upload/update the logo of the given organization.',
				errors: [{ info: UNAUTHORIZED_ACCESS }],
				log: {
					level: 'debug',
					message: 'Unauthorized access to upload/update the logo of the given organization.',
					meta: { consumer, consumerId, organizationId },
				}
			});
		}

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'organizations/' + organizationId,
				'Content-Type': `image/webp`,
				'Cache-Control': `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`,
				'Content-Disposition': `attachment; filename="organization-${organizationId}.webp"`,
			},
			Conditions: [
				['content-length-range', 0, ORGANIZATION_LOGO_SIZE_LIMIT],
				['eq', '$Cache-Control', `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$key', 'organizations/' + organizationId],
				['eq', '$Content-Disposition', `attachment; filename="organization-${organizationId}.webp"`]
			],
			Expires: ORGANIZATION_LOGO_POST_URL_EXPIRATION,
		});

		logger.debug('Created presigned post url for organization logo', { organizationId });

		return message(
			'Presigned post url generated successfully.',
			{ ...signedPost }
		);
	}),
);

router.delete(
	'/:organizationId',
	[
		organizationIdQueryValidator,
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['organization.logo.delete'], db, logger),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const sub = req.auth?.sub!;
		const organizationId = parseInt(req.params.organizationId);
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationIdFromToken,
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		let isAllowed = false;

		if (grantType === 'password') {
			const { rowCount } = await isUserAdminOrOwnerOfOrganization(sub, organizationId);

			if (rowCount) isAllowed = true;
		}
		
		if (organizationId === organizationIdFromToken) isAllowed = true;

		if (!isAllowed) {
			const consumer = grantType === 'password' ? 'User' : 'Client';
			const consumerId = grantType === 'password' ? sub : clientId;

			throw new AppError({
				status: 401,
				message: 'Unauthorized access to delete the logo of the given organization.',
				errors: [{ info: UNAUTHORIZED_ACCESS }],
				log: {
					level: 'debug',
					message: 'Unauthorized access to delete the logo of the given organization.',
					meta: {
						consumer,
						consumerId,
						organizationId
					},
				}
			});
		}

		await s3
			.deleteObjects({
				Bucket: BUCKET,
				Delete: {
					Objects: [{ Key: 'organizations/' + organizationId }],
				},
			})
			.promise();

		logger.debug('Deleted logo from organization', { organizationId });

		return 204;
	}),
);

export default router;
