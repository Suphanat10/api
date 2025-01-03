const { authJwt } = require("../middleware");
const controller = require("../controllers/bill.controller");
// const controller = require("../controllers/upimage.controller");


module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get(
    "/api/all/bills/:room_id",
    [authJwt.verifyToken],
    controller.get_bill
  );


  app.post(
    "/api/create/bill",
    [authJwt.verifyToken],
    controller.create_bill
  );

  app.get(
    "/api/all/rooms",
    [authJwt.verifyToken],
    controller.get_room
  );

  app.get(
    "/api/room/:room_id",
    [authJwt.verifyToken],
    controller.get_room_by_id
  );


  app.get(
    "/api/receipt/:invoice_id",
    [authJwt.verifyToken],
    controller.generateReceipt
  );

  app.put(
    "/api/update/bill/:invoice_id",
    [authJwt.verifyToken],
    controller.update_bill
  );


  app.delete(
    "/api/delete/bill/:invoice_id",
    [authJwt.verifyToken],
    controller.delete_bill
  );



  
  




};