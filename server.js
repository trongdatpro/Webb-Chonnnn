const express = require('express');
const cors = require('cors');
const { PayOS } = require('@payos/node'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

console.log("-----------------------------------------");
console.log("PAYOS CONFIG CHECK:");
console.log("Client ID:", process.env.PAYOS_CLIENT_ID ? "LOADED" : "MISSING");
console.log("API Key:", process.env.PAYOS_API_KEY ? "LOADED" : "MISSING");
console.log("Checksum Key:", process.env.PAYOS_CHECKSUM_KEY ? "LOADED" : "MISSING");
console.log("-----------------------------------------");

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

// Endpoint: Create Payment Link
app.post('/create-payment-link', async (req, res) => {
    try {
        const { amount, description } = req.body;
        const orderCode = Number(String(Date.now()).slice(-8)); 

        const paymentLinkRequest = {
            orderCode: orderCode,
            amount: Number(amount),
            description: "Thanh toan Chon Village",
            cancelUrl: "https://webb-chonnnn.onrender.com",
            returnUrl: "https://webb-chonnnn.onrender.com/checkout.html"
        };

        console.log(">>> [%s] CREATING PAYMENT:", new Date().toISOString(), orderCode);
        const paymentLink = await payos.paymentRequests.create(paymentLinkRequest);
        res.json(paymentLink);
    } catch (error) {
        console.error("Lỗi PayOS Create:", error);
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

// Endpoint: Check Payment Status
app.get('/check-payment/:orderCode', async (req, res) => {
    try {
        const orderCode = req.params.orderCode;
        console.log(">>> [%s] CHECKING STATUS:", new Date().toISOString(), orderCode);
        const orderInfo = await payos.getPaymentLinkInformation(orderCode);
        console.log(">>> [%s] STATUS for %s: %s", new Date().toISOString(), orderCode, orderInfo.status);
        res.json({ status: orderInfo.status });
    } catch (error) {
        console.error("Lỗi Check Status:", error);
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

// Critical: Use process.env.PORT for Render compatibility
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log("-----------------------------------------");
    console.log(`🚀 SERVER CHON VILLAGE RUNNING ON PORT ${PORT}`);
    console.log("-----------------------------------------");
});