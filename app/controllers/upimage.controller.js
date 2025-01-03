const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const upload_slip = async (req, res) => {
    try {
        const { invoice_id } = req.params;  
        const file = req.file;

        console.log(invoice_id);
        console.log(file);

        // Find invoice by correct field name (assuming it's 'id')
        const invoice = await prisma.invoice.findUnique({
            where: {
                id: parseInt(invoice_id), // Change to 'id' or correct field
            },
        });

        if (!invoice) {
            return res.status(404).send({ message: "Invoice not found" });
        }

        // Update invoice with payment proof (file)
        const slip = await prisma.invoice.update({
            where: {
                id: parseInt(invoice_id), // Use correct field name here
            },
            data: {
                status: "Payment",
                payment_proof: req.file.filename, 
            },
        });

        res.status(200).send({
            status: true,
            image: req.file.filename,
        });
    } catch (error) {
        console.error("Error finding invoice:", error);
        return res.status(500).send({ message: error.message });
    } finally {
        await prisma.$disconnect();
    }
};

module.exports = {
    upload_slip,
};






  




