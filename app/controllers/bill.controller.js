const config = require("../config/auth.config");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PDFDocument = require("pdfkit");
const fs = require("fs");


const create_bill = async (req, res) => {
     try{
       const { room_fee,water_fee,electricity_fee,other_expenses,room_id, invoice_date } = req.body;
        console.log(req.body);

         if (room_fee === undefined || water_fee === undefined || electricity_fee === undefined || other_expenses === undefined || room_id === undefined || invoice_date === undefined) {
               return res.status(400).send({ message: "All fields are required." });
         }

         const formattedInvoiceDate = new Date(invoice_date).toISOString();
         console.log(formattedInvoiceDate);

        const createBill = await prisma.invoice.create({
         data: {
           room_fee: room_fee,
           invoice_date: formattedInvoiceDate,
           water_fee: water_fee,
           electricity_fee: electricity_fee,
           other_expenses: other_expenses,
           room_id:  parseInt(room_id,10),
           status: "unpaid",  
         },
       });
       

         return res.send({ message: "Bill was created successfully!", createBill });
     } catch (error) {
         console.error("Error creating bill:", error);
         return res.status(500).send({ message: error });
     }
   }


   const get_bill = async (req, res) => {
      try {
        const room_id = parseInt(req.params.room_id, 10);
    
        const bill = await prisma.room.findFirst({
          include: {
            invoices: true,  
          },
          where: {
            id: room_id, 
          }
        });
    
        if (!bill) {
          return res.status(404).send({ message: "Room not found" });
        }
    
        return res.send({ message: "Bill was found successfully!", bill });
      } catch (error) {
        console.error("Error finding bill:", error);
        return res.status(500).send({ message: error.message });
      } finally {
        await prisma.$disconnect();
      }
    };


    const  get_room  = async (req, res) => {
      try {
        const room = await prisma.room.findMany(
          {
            include: {
              invoices: true,
            },
          }
        );

         if (!room) {
            return res.status(404).send({ message: "Room not found" });
         }


        return res.send({ message: "Room was found successfully!", room });
      } catch (error) {
        console.error("Error finding room:", error);
        return res.status(500).send({ message: error.message });
      } finally {
        await prisma.$disconnect();
      }
    }


      const get_room_by_id = async (req, res) => {
        try {

          const room_id = parseInt(req.params.room_id, 10);
          const room = await prisma.Invoice.findMany({

              where: {
                room_id: room_id,
              }
          });
    
          if (!room) {
            return res.status(404).send({ message: "Room not found" });
          }
    
          return res.send({ message: "Room was found successfully!", room });
        } catch (error) {
          console.error("Error finding room:", error);
          return res.status(500).send({ message: error.message });
        } finally {
          await prisma.$disconnect();
        }

      };


   



      const generateReceipt = async (req, res) => {
        try {
          // ตรวจสอบและแปลงค่าจาก req.params
          const Invoice_id =  req.params.invoice_id
          if (isNaN(Invoice_id)) {
            return res.status(400).send({ message: "รหัสใบแจ้งหนี้ไม่ถูกต้อง" });
          }
      
          // ค้นหาใบแจ้งหนี้
          const invoice = await prisma.Invoice.findFirst({
            where: { id: parseInt(Invoice_id, 10) },
          });
      
          if (!invoice) {
            return res.status(404).send({ message: "ไม่พบข้อมูลใบแจ้งหนี้" });
          }
      
          // ค้นหาข้อมูลห้อง
          const roomData = await prisma.Room.findFirst({
            where: { id: parseInt(invoice.room_id, 10) },
          });
      
          if (!roomData) {
            return res.status(404).send({ message: "ไม่พบข้อมูลห้อง" });
          }
      
          // สร้าง PDF
          const doc = new PDFDocument({ margin: 50 });
          const fontPath = "../fonts/Kanit-Light.ttf";
          doc.registerFont("Kanit", fontPath);
          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename=receipt_${Invoice_id}.pdf`
            );
            res.send(pdfBuffer);
          });
      
          // เขียนข้อมูลลงใน PDF
          doc.fontSize(25).text("Receipt", { align: "center" }).moveDown();
          doc.fontSize(15).text(`Billing Date: ${new Date(invoice.invoice_date).toLocaleDateString("en-US")}`, { align: "right" }); 
          doc.fontSize(15).fillColor("black").text("Name : Suphanat Bamrungna ", {
            align: "right",
          });
          doc.fontSize(15).fillColor("black").text("Email : suphanat@gmail.com", {
            align: "right",
          });

          doc.moveDown();
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // เส้นคั่น
      
          // เพิ่มรายละเอียดห้อง
          doc.moveDown();
          doc.fontSize(15).text("Room Details", { underline: true });
          doc.text(`Room Number: ${roomData.room_number}`);
          doc.text(`Location: ${roomData.location}`);
          doc.moveDown();
      
          // เพิ่มรายละเอียดใบแจ้งหนี้
          doc.fontSize(15).text("Invoice Details", { underline: true });
          doc.text(`Room : $${invoice.room_fee.toFixed(2)} baht `);
          doc.text(`Water: $${invoice.water_fee.toFixed(2)} baht `);
          doc.text(`Electricity: $${invoice.electricity_fee.toFixed(2)}`);
          doc.text(`Other Expenses: $${invoice.other_expenses.toFixed(2)}`);
          doc.text(`Status: ${invoice.status}`);
          doc.moveDown();
     
      
          // คำนวณยอดรวมและแสดงผล
          const total =(Number(invoice.room_fee) + Number(invoice.water_fee) + Number(invoice.electricity_fee) + Number(invoice.other_expenses));
          doc.fontSize(20).fillColor("blue").text(`Total: ${total.toFixed(2)} baht `, {
            align: "right",
          });
          doc.moveDown();
         



          doc.fontSize(15).fillColor("black").text("Thank you for your payment!" , {
            align: "right",
          });
      
          // ปิดเอกสาร
          doc.end();
        } catch (error) {
          console.error("Error generating receipt:", error);
          return res.status(500).send({ message: "เกิดข้อผิดพลาดในการสร้างใบเสร็จ" });
        }
      };



      const update_bill = async (req, res) => {
        try {
          const { room_fee, water_fee, electricity_fee, other_expenses , invoice_date } = req.body;
          const invoice_id = parseInt(req.params.invoice_id, 10);

          const  date = new Date(invoice_date).toISOString();
          console.log(date);
      
          if (room_fee === undefined || water_fee === undefined || electricity_fee === undefined || other_expenses === undefined || invoice_date === undefined) {
            return res.status(400).send({ message: "All fields are required." });
          }
      
          const updateBill = await prisma.Invoice.update({
            where: { id: invoice_id },
            data: {
              room_fee: room_fee,
              water_fee: water_fee,
              electricity_fee: electricity_fee,
              other_expenses: other_expenses,
              invoice_date: date,
            },
          });
      
          return res.send({ message: "Bill was updated successfully!", updateBill });
        } catch (error) {
          console.error("Error updating bill:", error);
          return res.status(500).send({ message: error });
        } finally {
          await prisma.$disconnect();
        }
      };


      const delete_bill = async (req, res) => {
        try {
          const invoice_id = parseInt(req.params.invoice_id, 10);
          console.log(invoice_id);
      
          const deleteBill = await prisma.Invoice.delete({
            where: { id: invoice_id },
          });
      
          return res.send({ message: "Bill was deleted successfully!", deleteBill });
        } catch (error) {
          console.error("Error deleting bill:", error);
          return res.status(500).send({ message: error });
        } finally {
          await prisma.$disconnect();
        }
      };



    



    

      
      


   
    

module.exports = {
      create_bill,
      get_bill,
      get_room,
      get_room_by_id,
      generateReceipt,
      update_bill,
      delete_bill,
   };



