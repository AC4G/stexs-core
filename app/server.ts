import express from 'express';
import bodyParser from 'body-parser';
import signUpRouter from './routes/signUp';
import signInRouter from './routes/signIn';
import signOutRouter from './routes/signOut';
import tokenRouter from './routes/token';
import oauth2Router from './routes/oauth2';
import userRouter from './routes/user';
import recoveryRouter from './routes/recovery';
import verifyRouter from './routes/verify';
import { NODE_ENV, SERVER_PORT } from '../env-config';

process.env.TZ = 'UTC';

const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

server.use('/sign-up', signUpRouter);
server.use('/sign-in', signInRouter);
server.use('/sign-out', signOutRouter);
server.use('/token', tokenRouter);
server.use('/oauth2', oauth2Router);
server.use('/verify', verifyRouter);
server.use('/user', userRouter);
server.use('/recovery', recoveryRouter);

if (NODE_ENV !== 'test') server.listen(SERVER_PORT, () => {
    console.log(`Server is listening on port ${SERVER_PORT}`);
});

export default server;
