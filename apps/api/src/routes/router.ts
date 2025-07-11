import { Router } from "express";
import authRouter from './auth/router';
import storageRouter from './storage/router';

const router = Router();

router.use('/auth', authRouter);
router.use('/storage', storageRouter);

export default router;
