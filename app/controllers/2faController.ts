import { Response } from "express";
import { Request } from "express-jwt";
import db from '../database';
import logger from '../loggers/logger';
import { errorMessages, message } from "../services/messageBuilderService";
import {
    INTERNAL_ERROR, 
    INVALID_CODE, 
    TOTP_ALREADY_VERIFIED 
} from "../constants/errors";
import { getTOTPForVerification } from "../services/totpService";

export async function verifyTOTP(req: Request, res: Response) {
    const userId = req.auth?.sub;
    const { code } = req.body;
    let secret;

    try {
        const { rowCount, rows } = await db.query(`
            SELECT totp_secret, totp_verified_at
            FROM auth.twofa
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`Failed to fetch 2FA TOTP secret and timestamp for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }

        if (rows[0].totp_verified_at) {
            logger.warn(`2FA TOTP is already verified for user: ${userId}`);
            return res.status(400).json(errorMessages([{ info: TOTP_ALREADY_VERIFIED }]));
        }

        secret = rows[0].totp_secret;
    } catch (e) {
        logger.error(`Error while fetching 2FA TOTP secret and timestamp for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    const totp = getTOTPForVerification(secret);

    if (totp.validate({ token: code, window: 1 }) === null) {
        logger.warn(`Invalid code provided for 2FA TOTP verification for user: ${userId}`);
        return res.status(403).json(errorMessages([{ 
            info: INVALID_CODE,
            data: {
                location: 'body',
                path: 'code'
            }
        }]));
    }

    try {
        const { rowCount } = await db.query(`
            UPDATE auth.twofa
            SET
                totp = TRUE,
                totp_verified_at = CURRENT_TIMESTAMP
            WHERE user_id = $1::uuid;
        `, [userId]);

        if (rowCount === 0) {
            logger.error(`Failed to update 2FA TOTP status and timestamp for user: ${userId}`);
            return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
        }
    } catch (e) {
        logger.error(`Error while updating 2FA TOTP status and timestamp for user: ${userId}. Error: ${(e instanceof Error) ? e.message : e}`);
        return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
    }

    logger.info(`Successfully enabled 2FA TOTP for user: ${userId}`);

    res.json(message('TOTP 2FA successfully enabled.'));
}
