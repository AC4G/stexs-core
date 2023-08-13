import * as restify from 'restify';
import signUpRouter from './routes/signUp';
import signInRouter from './routes/signIn';
import oauth2Router from './routes/oauth2';

const server = restify.createServer();

server.use(restify.plugins.queryParser());

// Routes
signUpRouter.applyRoutes(server);
signInRouter.applyRoutes(server);
oauth2Router.applyRoutes(server);

server.listen(3001, () => {
    console.log('Server is listening on port 3001');
});
