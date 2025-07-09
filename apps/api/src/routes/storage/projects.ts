import { Router } from 'express';
import logger from '../../logger';
import { Request } from 'express-jwt';
import { UNAUTHORIZED_ACCESS } from 'utils-node/errors';
import db from '../../db';
import { message } from 'utils-node/messageBuilder';
import {
	ACCESS_TOKEN_SECRET,
	AUDIENCE,
	BUCKET,
	ISSUER,
	PROJECT_LOGO_GET_URL_EXPIRATION,
	PROJECT_LOGO_POST_URL_EXPIRATION,
	PROJECT_LOGO_SIZE_LIMIT,
	S3_CACHE_CONTROL_EXPIRATION,
} from '../../../env-config';
import s3 from '../../s3';
import {
	validate,
	checkScopes,
	checkTokenGrantType,
	transformJwtErrorMessages,
	validateAccessToken,
} from 'utils-node/middlewares';
import { isUserAdminOrOwnerOfProject } from '../../repositories/public/projectMembers';
import { isClientAllowedToAccessProject } from '../../repositories/public/projects';
import { projectIdQueryValidator } from '../../utils/validators';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';

const router = Router();

router.get(
	'/:projectId',
	[
		projectIdQueryValidator,
		validate(logger),
	],
	asyncHandler(async (req: Request) => {
		const { projectId } = req.params;

		const expires = PROJECT_LOGO_GET_URL_EXPIRATION;

		const signedUrl = await s3.getSignedUrl('getObject', {
			Bucket: BUCKET,
			Key: `projects/${projectId}`,
			Expires: expires,
		});

		logger.debug('Generated new presigned url for project logo', { projectId });

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
	'/:projectId',
	[
		projectIdQueryValidator,
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['project.logo.write'], db, logger),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const sub = req.auth?.sub!;
		const { projectId } = req.params;
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
			const { rowCount } = await isUserAdminOrOwnerOfProject(sub, Number(projectId));

			if (rowCount === 1) isAllowed = true;
		} else {
			const { rowCount } = await isClientAllowedToAccessProject(
				organizationId,
				Number(projectId),
				clientId
			);

			if (rowCount === 1) isAllowed = true;
		}

		if (!isAllowed) {
			const consumer = grantType === 'password' ? 'User' : 'Client';
			const consumerId = grantType === 'password' ? sub : clientId;

			throw new AppError({
				status: 401,
				message: 'Unauthorized access to upload/update the logo of the given project.',
				errors: [{ info: UNAUTHORIZED_ACCESS }],
				log: {
					level: 'debug',
					message: 'Unauthorized access to upload/update the logo of the given project',
					meta: {
						consumer,
						consumerId,
						projectId
					}
				}
			});
		}

		const signedPost = await s3.createPresignedPost({
			Bucket: BUCKET,
			Fields: {
				key: 'projects/' + projectId,
				'Content-Type': `image/webp`,
				'Cache-Control': `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`,
				'Content-Disposition': `attachment; filename="project-${projectId}.webp"`,
			},
			Conditions: [
				['content-length-range', 0, PROJECT_LOGO_SIZE_LIMIT],
				['eq', '$Cache-Control', `private, max-age=${S3_CACHE_CONTROL_EXPIRATION}, must-revalidate`],
				['eq', '$Content-Type', `image/webp`],
				['eq', '$key', 'projects/' + projectId],
				['eq', '$Content-Disposition', `attachment; filename="project-${projectId}.webp"`]
			],
			Expires: PROJECT_LOGO_POST_URL_EXPIRATION,
		});

		logger.debug('Created signed post url for project logo', { projectId });

		return message(
			'Presigned url generated successfully.',
			{ ...signedPost }
		);
	}),
);

router.delete(
	'/:projectId',
	[
		projectIdQueryValidator,
		validate(logger),
		validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
		checkTokenGrantType(['password', 'client_credentials']),
		checkScopes(['project.logo.delete'], db, logger),
		transformJwtErrorMessages(logger),
	],
	asyncHandler(async (req: Request) => {
		const sub = req.auth?.sub!;
		const { projectId } = req.params;
		const {
			grant_type: grantType,
			client_id: clientId,
			organization_id: organizationId,			
		} = req.auth as {
			grant_type: string;
			client_id: string;
			organization_id: number;
		};

		let rowsFound = false;

		if (grantType === 'password') {
			const { rowCount } = await isUserAdminOrOwnerOfProject(sub, Number(projectId));

			if (rowCount === 1) rowsFound = true;
		} else {
			const { rowCount } = await isClientAllowedToAccessProject(
				organizationId,
				Number(projectId),
				clientId
			);

			if (rowCount === 1) rowsFound = true;
		}

		if (!rowsFound) {
			const consumer = grantType === 'password' ? 'User' : 'Client';
			const consumerId = grantType === 'password' ? sub : clientId;

			throw new AppError({
				status: 401,
				message: 'Unauthorized access to delete the logo of the given project.',
				errors: [{ info: UNAUTHORIZED_ACCESS }],
				log: {
					level: 'debug',
					message: 'Unauthorized access to delete the logo of the given project',
					meta: {
						consumer,
						consumerId,
						projectId
					}
				}
			});
		}

		await s3
			.deleteObjects({
				Bucket: BUCKET,
				Delete: {
					Objects: [{ Key: 'projects/' + projectId }],
				},
			})
			.promise();

		logger.debug(`Deleted logo from project: ${projectId}`);

		return 204;
	}),
);

export default router;
