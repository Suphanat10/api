const { verifySignUp } = require("../middleware");
const controller = require("../controllers/auth.controller");
const { authJwt } = require("../middleware");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

   app.post(
      "/api/auth/register",
      controller.reg
   );

   app.post(
      "/api/auth/login",
      controller.login
   );

   app.post(
      "/api/auth/logout",
      [authJwt.verifyToken],
      controller.logout
   )

};