const config = require("../config/auth.config");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const reg = async (req, res) => {
   try {
      const { username, email, password, name } = req.body;

      if (!username || !email || !password || !name) {
         return res.status(400).send({ message: "All fields are required." });
      }

      const user_ = await prisma.User.findFirst({
          where: {
              email: email,
          },
      });

      if (user_) {
         return res.status(400).send({ message: "Failed! Email is already in use!" });
      }

      // Create new user
      const createUser = await prisma.User.create({
         data: {
            username: username,
            email: email,
            password: bcrypt.hashSync(password, 8),
            name: name,
         },
      });

      // Generate token
      const token = jwt.sign({ id: createUser.user_id }, config.secret, { expiresIn: 86400 });

      return res.send({ 
         message: "User was registered successfully!", 
         user: createUser,
         token 
      });
   } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).send({ message: "An error occurred while registering the user." });
   } finally {
      await prisma.$disconnect(); // Clean up the Prisma client connection
   }
};

const login = async (req, res) => {
   try {
     const email = req.body.email;
     const password = req.body.password;
 
     const user = await prisma.User.findFirst({
       where: {
         email: email,
       },
     });

     if (!user) {
       return res.status(404).send({
         message: "ไม่พบผู้ใช้งาน",
         code: 404,
       });
     }
 
     var passwordIsValid = bcrypt.compareSync(password, user.password);
 
     if (!passwordIsValid) {
       return res.status(401).send({
         accessToken: null,
         code: 401,
         message: "Invalid Password!",
       });
     }
 
     var token = jwt.sign({ id: user.user_id }, config.secret, {
       expiresIn: 86400,
     });

     return res.status(200).send({
        user: user,
        accessToken: token,
        code: 200,
      });

 
    
     
   } catch (err) {
     res.status(500).send({
       message: "Some error occurred while logging in the User.",
       code: 500,
     });
   }
};

const logout  = async (req, res) => {
  try {
    res.clearCookie("accessToken");
    res.status(200).send({
      message: "User was logout successfully!",
      code: 200,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while logout the User.",
      code: 500,
    });
  }

};

exports.reg = reg;
exports.login = login;
exports.logout = logout;







