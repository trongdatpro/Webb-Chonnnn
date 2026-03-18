const express = require('express');
const cors = require('cors');
// Lấy đúng đoạn code: const { PayOS } = require('@payos/node');
const { PayOS } = require('@payos/node'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Đoạn 1: Khởi tạo (Lấy từ phần Basic usage của bạn)
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

// Đoạn 2: Tạo link thanh toán (Lấy từ phần paymentRequests.create)
app.post('/create-payment-link', async (req, res) => {
    try {
        const { amount, description } = req.body;
        // Use 8-digit order code for better uniqueness
        const orderCode = Number(String(Date.now()).slice(-8)); 

        const paymentLinkRequest = {
            orderCode: orderCode,
            amount: Number(amount),
            description: "Thanh toan Chon Village",
            cancelUrl: "https://webb-chonnnn.onrender.com",
            returnUrl: "https://webb-chonnnn.onrender.com"
        };

        console.log(">>> CALLING PAYOS CREATE (paymentRequests):", paymentLinkRequest);
        const paymentLink = await payos.paymentRequests.create(paymentLinkRequest);
        
        console.log(">>> PAYOS RESPONSE SUCCESS:", paymentLink.orderCode);
        console.log(">>> FULL PAYOS RESPONSE:", JSON.stringify(paymentLink));

        res.json(paymentLink);

    } catch (error) {
        console.error("Lỗi PayOS:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log("-----------------------------------------");
    console.log("🚀 SERVER CHON VILLAGE DA CHAY TAI CONG 3000");
    console.log("-----------------------------------------");
});