const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const verifyToken = (req, res, next) => {
  const accessTokenHeader = req.headers["x-access-token"];
  console.log(accessTokenHeader);

  if (!accessTokenHeader) {
    return res.status(403).send({
      message: "No Token provided or invalid format!",
    });
  }

  const accessToken = accessTokenHeader.split(" ")[1];
  if (!accessToken) {
    return res.status(403).send({
      message: "No Token provided!",
    });
  }

  jwt.verify(accessToken, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Unauthorized!",
      });
    }

    req.id = decoded.id;
    next();
  });
};

module.exports = {
  verifyToken,
};



