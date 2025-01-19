import { Router } from "express";
import signUpRouter from './signUp';
import signInRouter from './signIn';
import signOutRouter from './signOut';
import tokenRouter from './token';
import oauth2Router from './oauth2';
import userRouter from './user';
import recoveryRouter from './recovery';
import verifyRouter from './verify';
import mfaRouter from './mfa';

const authRouter = Router();

authRouter.use('/sign-up', signUpRouter);
authRouter.use('/sign-in', signInRouter);
authRouter.use('/sign-out', signOutRouter);
authRouter.use('/token', tokenRouter);
authRouter.use('/oauth2', oauth2Router);
authRouter.use('/verify', verifyRouter);
authRouter.use('/user', userRouter);
authRouter.use('/recovery', recoveryRouter);
authRouter.use('/mfa', mfaRouter);

export default authRouter;
