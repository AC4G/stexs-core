const restify = require('restify');
const Router = require('restify-router').Router;
const router = new Router();

router.group('/oauth2', (router) => {
    router.post('/authorize', (req, res, next) => {
        return next();
    });
});

module.exports = router;
