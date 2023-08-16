import * as restify from 'restify';
import signUpRouter from './routes/signUp';
import signInRouter from './routes/signIn';
import oauth2Router from './routes/oauth2';
import { PORT } from '../env-config';

const server = restify.createServer();

server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

// Routes
signUpRouter.applyRoutes(server);
signInRouter.applyRoutes(server);
oauth2Router.applyRoutes(server);

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
