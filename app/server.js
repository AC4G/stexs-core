var signUpRouter = require('./routes/signUp');
var signInRouter = require('./routes/signIn');
var oauth2Router = require('./routes/oauth2');

const restify = require('restify');
const server = restify.createServer();

server.use(restify.plugins.queryParser());

//routes
signUpRouter.applyRoutes(server);
signInRouter.applyRoutes(server);
oauth2Router.applyRoutes(server);

server.listen(3001, () => {
    console.log('Server is listening on port 3001');
});
