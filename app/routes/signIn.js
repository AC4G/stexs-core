const restify = require('restify');
const Router = require('restify-router').Router;
const router = new Router();

router.post('/signIn', (req, res, next) => {
    return next();
});

module.exports = router;
