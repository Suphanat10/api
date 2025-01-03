const controller = require("../controllers/upimage.controller");
const { authJwt } = require("../middleware");
const upload_slip = require("../controllers/multer_slip");





module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });


   app.post("/api/img/upload/slip/:invoice_id",
      [authJwt.verifyToken],
      upload_slip.single('payment_slip'),  
      controller.upload_slip);

   };