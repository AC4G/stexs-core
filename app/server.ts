import express from 'express';
import bodyParser from 'body-parser';
import signUpRouter from './routes/signUp';
import signInRouter from './routes/signIn';
import oauth2Router from './routes/oauth2';
import { PORT } from '../env-config';

const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

// Routes
server.use('/signUp', signUpRouter);
server.use('/signIn', signInRouter);
server.use('/oauth2', oauth2Router);

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
