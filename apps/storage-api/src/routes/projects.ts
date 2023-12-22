import { Router, Response } from 'express';
import logger from '../loggers/logger';
import { Request } from 'express-jwt';
import validate from 'utils-ts/validatorMiddleware';
import { param } from 'express-validator';
import { 
    INTERNAL_ERROR, 
    PROJECT_ID_NOT_NUMERIC, 
    PROJECT_ID_REQUIRED, 
    PROJECT_NOT_FOUND, 
    UNAUTHORIZED_ACCESS 
} from 'utils-ts/errors';
import db from '../database';
import { errorMessages } from 'utils-ts/messageBuilder';
import { 
    ACCESS_TOKEN_SECRET, 
    AUDIENCE, 
    BUCKET, 
    ISSUER 
} from '../../env-config';
import s3 from '../s3';
import { 
    checkTokenGrantType, 
    transformJwtErrorMessages, 
    validateAccessToken 
} from 'utils-ts/jwtMiddleware';

const router = Router();

router.get(
    '/:projectId',
    [
        param('projectId')
            .notEmpty()
            .withMessage(PROJECT_ID_REQUIRED)
            .bail()
            .isNumeric()
            .withMessage(PROJECT_ID_NOT_NUMERIC),
        validate(logger)
    ], 
    async (req: Request, res: Response) => {
        const { projectId } = req.params; 

        const time = 60 * 60 * 24 * 7; // 7 days in seconds

        const signedUrl = await s3.getSignedUrl('getObject', {
            Bucket: BUCKET,
            Key: `projects/${projectId}`,
            Expires: time
        });
        
        logger.info(`Generated new presigned url for project logo: ${projectId}`);
        
        return res.json({
            url: signedUrl
        });
});

router.post(
    '/:projectId',
    [
        validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
        checkTokenGrantType([
            'password',
            //'client_credentials'
        ]),
        transformJwtErrorMessages(logger),
        param('projectId')
            .notEmpty()
            .withMessage(PROJECT_ID_REQUIRED)
            .bail()
            .isNumeric()
            .withMessage(PROJECT_ID_NOT_NUMERIC),
        validate(logger)
    ],
    async (req: Request, res: Response) => {
      const userId = req.auth?.sub!;
      const { projectId } = req.params;
  
      try {
        const { rowCount } = await db.query(
            `
                SELECT 1
                FROM public.project_members
                WHERE member_id = $1::uuid AND project_id = $2::integer AND role IN ('Admin', 'Owner');
            `,
            [userId, projectId],
        );
  
        if (rowCount === 0) {
            logger.error(
                `User is not authorized to upload/update the logo of the given project: ${projectId}. User: ${userId}`,
            );
            return res
                .status(401)
                .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
        }
      } catch (e) {
        logger.error(
            `Error while checking the current user if authorized for uploading/updating project logo. Error: ${
                e instanceof Error ? e.message : e
            }`,
        );
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
      }
  
      const signedPost = await s3.createPresignedPost({
        Bucket: BUCKET,
        Fields: {
            key: 'projects/' + projectId,
            'Content-Type': `image/webp`,
        },
        Conditions: [
            ['content-length-range', 0, 1024 * 1024],
            ['eq', '$Content-Type', `image/webp`],
        ],
        Expires: 60,
      });
  
      logger.info(`Created signed post url for project logo: ${projectId}`);
  
      return res.json(signedPost);
    },
);

router.delete(
    '/:projectId',
    [
        validateAccessToken(ACCESS_TOKEN_SECRET, AUDIENCE, ISSUER),
        checkTokenGrantType([
            'password',
            //'client_credentials'
        ]),
        transformJwtErrorMessages(logger),
        param('projectId')
            .notEmpty()
            .withMessage(PROJECT_ID_REQUIRED)
            .bail()
            .isNumeric()
            .withMessage(PROJECT_ID_NOT_NUMERIC),
        validate(logger)
    ],
    async (req: Request, res: Response) => {
        const userId = req.auth?.sub!;
        const { projectId } = req.params;

        try {
            const { rowCount } = await db.query(
                `
                    SELECT 1
                    FROM public.project_members
                    WHERE member_id = $1::uuid AND project_id = $2::integer AND role IN ('Admin', 'Owner');
                `,
                [userId, projectId],
            );
      
            if (rowCount === 0) {
                logger.error(
                    `User is not authorized to delete the logo of the given project: ${projectId}. User: ${userId}`,
                );
                return res
                    .status(401)
                    .json(errorMessages([{ info: UNAUTHORIZED_ACCESS }]));
            }
        } catch (e) {
            logger.error(
                `Error while checking the current user if authorized for deleting project logo. Error: ${
                    e instanceof Error ? e.message : e
                }`,
            );
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        try {
            await s3
                .deleteObjects({
                Bucket: BUCKET,
                Delete: {
                    Objects: [{ Key: 'projects/' + projectId }],
                },
                })
                .promise();

            logger.info(`Deleted logo from project: ${projectId}`);
        } catch (e) {
            logger.error(
                `Error while deleting project logo. Error: ${
                e instanceof Error ? e.message : e
                }`,
            );
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        return res.status(204).json();
});

export default router;
