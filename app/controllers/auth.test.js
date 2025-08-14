const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mPrisma = {
    User: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $disconnect: jest.fn().mockResolvedValue(),
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { reg, login, logout } = require("./auth.controller");

// Setup Express app
const app = express();
app.use(bodyParser.json());
app.post("/register", reg);
app.post("/login", login);
app.post("/logout", logout);

describe("Auth Controller Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------- Registration Tests ---------
  test("should return 400 if any field is missing", async () => {
    const res = await request(app).post("/register").send({
      username: "user1",
      email: "user1@test.com",
      name: "User One",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("All fields are required.");
  });

  test("register with invalid email format", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/register").send({
      username: "userx",
      email: "invalid-email",
      password: "password123",
      name: "User X",
    });
    expect(res.status).toBe(400);
  });

  test("should return 400 if email already exists", async () => {
    prisma.User.findFirst.mockResolvedValue({ email: "user1@test.com" });
    const res = await request(app).post("/register").send({
      username: "user1",
      email: "user1@test.com",
      password: "password123",
      name: "User One",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Failed! Email is already in use!");
  });

  test("register with empty strings", async () => {
    const res = await request(app).post("/register").send({
      username: "",
      email: "",
      password: "",
      name: "",
    });
    expect(res.status).toBe(400);
  });

  test("register successfully with valid data", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    prisma.User.create.mockResolvedValue({
      user_id: 1,
      username: "user3",
      email: "user3@test.com",
      name: "User Three",
    });

    const res = await request(app).post("/register").send({
      username: "user3",
      email: "user3@test.com",
      password: "password123",
      name: "User Three",
    });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe("user3");
  });

  test("register fails if Prisma create throws error", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    prisma.User.create.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).post("/register").send({
      username: "user4",
      email: "user4@test.com",
      password: "password123",
      name: "User Four",
    });

    expect(res.status).toBe(500);
  });

  // --------- Login Tests ---------
  test("should return 404 if user not found", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/login").send({
      email: "notfound@test.com",
      password: "password123",
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("ไม่พบผู้ใช้งาน");
  });

  test("should login successfully with valid credentials", async () => {
    const hashedPassword = bcrypt.hashSync("password123", 8);
    prisma.User.findFirst.mockResolvedValue({
      user_id: 1,
      password: hashedPassword,
      email: "user1@test.com",
      name: "User One",
      status: "active",
    });

    const res = await request(app).post("/login").send({
      email: "user1@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.email).toBe("user1@test.com");
  });

  test("login with empty email and password", async () => {
    const res = await request(app).post("/login").send({
      email: "",
      password: "",
    });
    expect(res.status).toBe(404);
  });

  test("login with wrong password", async () => {
    const hashedPassword = bcrypt.hashSync("password123", 8);
    prisma.User.findFirst.mockResolvedValue({
      user_id: 2,
      password: hashedPassword,
      email: "user2@test.com",
      name: "User Two",
      status: "active",
    });

    const res = await request(app).post("/login").send({
      email: "user2@test.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });

  test("login with inactive user", async () => {
    const hashedPassword = bcrypt.hashSync("password123", 8);
    prisma.User.findFirst.mockResolvedValue({
      user_id: 3,
      password: hashedPassword,
      email: "user3@test.com",
      name: "User Three",
      status: "inactive",
    });

    const res = await request(app).post("/login").send({
      email: "user3@test.com",
      password: "password123",
    });

    expect(res.status).toBe(403);
  });

  test("login with email case insensitive", async () => {
    const hashedPassword = bcrypt.hashSync("password123", 8);
    prisma.User.findFirst.mockResolvedValue({
      user_id: 4,
      password: hashedPassword,
      email: "user4@test.com",
      name: "User Four",
      status: "active",
    });

    const res = await request(app).post("/login").send({
      email: "USER4@TEST.COM",
      password: "password123",
    });

    expect(res.status).toBe(200);
  });

  test("login fails if Prisma throws error", async () => {
    prisma.User.findFirst.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).post("/login").send({
      email: "user5@test.com",
      password: "password123",
    });

    expect(res.status).toBe(500);
  });

  // --------- Logout Tests ---------
  test("should logout successfully", async () => {
    const res = await request(app).post("/logout").send();
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User was logout successfully!");
  });

  test("should not require request body for logout", async () => {
    const res = await request(app).post("/logout").send();
    expect(res.status).toBe(200);
  });

  test("logout handles Prisma error gracefully", async () => {
    prisma.$disconnect.mockRejectedValue(new Error("DB Error"));
    const res = await request(app).post("/logout").send();
    expect(res.status).toBe(200);
  });

  // Additional edge cases
  test("register with very long username", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    prisma.User.create.mockResolvedValue({
      user_id: 5,
      username: "u".repeat(300),
      email: "longuser@test.com",
      name: "Long User",
    });

    const res = await request(app).post("/register").send({
      username: "u".repeat(300),
      email: "longuser@test.com",
      password: "password123",
      name: "Long User",
    });

    expect(res.status).toBe(201);
  });

  test("register fails if Prisma create throws unknown error", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    prisma.User.create.mockRejectedValue(new Error("Unknown Error"));

    const res = await request(app).post("/register").send({
      username: "user6",
      email: "user6@test.com",
      password: "password123",
      name: "User Six",
    });

    expect(res.status).toBe(500);
  });

  test("login with SQL injection attempt", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/login").send({
      email: "' OR '1'='1",
      password: "password123",
    });
    expect(res.status).toBe(404);
  });

  test("register with special characters in username", async () => {
    prisma.User.findFirst.mockResolvedValue(null);
    prisma.User.create.mockResolvedValue({
      user_id: 7,
      username: "!@#$%^&*()",
      email: "special@test.com",
      name: "Special User",
    });

    const res = await request(app).post("/register").send({
      username: "!@#$%^&*()",
      email: "special@test.com",
      password: "password123",
      name: "Special User",
    });

    expect(res.status).toBe(201);
  });
});






// Registration Tests

// should return 400 if any field is missing

// ทดสอบว่าถ้า request body ขาด field ใดไป ระบบจะตอบกลับ 400 พร้อมข้อความบอกว่าต้องกรอกครบทุก field

// register with invalid email format

// ทดสอบรูปแบบ email ผิด เช่น "invalid-email" ระบบควรตอบ 400

// should return 400 if email already exists

// ทดสอบการลงทะเบียนซ้ำ email ระบบต้องตอบ 400 และบอกว่า email ใช้งานแล้ว

// register with empty strings

// ทดสอบกรอกข้อมูลเป็นสตริงว่างทุก field ระบบต้องตอบ 400

// register successfully with valid data

// ทดสอบการลงทะเบียนปกติด้วยข้อมูลถูกต้อง ระบบควรสร้าง user และตอบ 201 พร้อมข้อมูล user

// register fails if Prisma create throws error

// ทดสอบกรณี Prisma สร้าง user ล้มเหลว ระบบต้องตอบ 500

// register with very long username

// ทดสอบการลงทะเบียน username ยาวมาก ระบบควรยังสามารถสร้าง user ได้

// register fails if Prisma create throws unknown error

// ทดสอบ Prisma สร้าง user มี error อะไรก็ได้ที่ไม่คาดคิด ระบบตอบ 500

// register with special characters in username

// ทดสอบ username มีตัวอักษรพิเศษ เช่น !@#$%^&*() ระบบควรลงทะเบียนสำเร็จ

// Login Tests

// should return 404 if user not found

// ทดสอบ login ด้วย email ที่ไม่มีในระบบ ระบบตอบ 404

// should login successfully with valid credentials

// ทดสอบ login ด้วย email/password ถูกต้อง ระบบตอบ 200 และคืน accessToken

// login with empty email and password

// ทดสอบ login โดยไม่กรอก email/password ระบบตอบ 404

// login with wrong password

// ทดสอบกรอก password ผิด ระบบตอบ 401

// login with inactive user

// ทดสอบ login user ที่ status เป็น inactive ระบบตอบ 403

// login with email case insensitive

// ทดสอบกรอก email เป็นตัวพิมพ์ใหญ่ ระบบควร login สำเร็จ

// login fails if Prisma throws error

// ทดสอบกรณี Prisma findFirst ล้มเหลว ระบบตอบ 500

// login with SQL injection attempt

// ทดสอบกรอก email แบบ ' OR '1'='1 เพื่อดูระบบปลอดภัยจาก SQL injection ระบบตอบ 404

// Logout Tests

// should logout successfully

// ทดสอบ logout ปกติ ระบบตอบ 200 พร้อมข้อความ "User was logout successfully!"

// should not require request body for logout

// ทดสอบ logout โดยไม่ส่งข้อมูลใน request body ระบบยังตอบ 200

// logout handles Prisma error gracefully

// ทดสอบกรณี Prisma disconnect ล้มเหลว ระบบยังตอบ 200 เพื่อให้ logout ไม่ล้ม