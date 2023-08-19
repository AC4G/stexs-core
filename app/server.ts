import express from 'express';
import bodyParser from 'body-parser';
import signUpRouter from './routes/signUp';
import signInRouter from './routes/signIn';
import signOutRouter from './routes/signOut';
import tokenRouter from './routes/token';
import oauth2Router from './routes/oauth2';
import { SERVER_PORT } from '../env-config';

const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

// Routes
server.use('/sign-up', signUpRouter);
server.use('/sign-in', signInRouter);
server.use('/sign-out', signOutRouter);
server.use('/token', tokenRouter);
server.use('/oauth2', oauth2Router);

server.listen(SERVER_PORT, () => {
    console.log(`Server is listening on port ${SERVER_PORT}`);
});
