const express = require('express');
const cors = require('cors');
const { PayOS } = require('@payos/node'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Diagnostics Endpoint: Check if keys are loaded
app.get('/diagnostics', (req, res) => {
    res.json({
        status: 'online',
        port: process.env.PORT || 3000,
        keys: {
            clientId: !!process.env.PAYOS_CLIENT_ID,
            apiKey: !!process.env.PAYOS_API_KEY,
            checksumKey: !!process.env.PAYOS_CHECKSUM_KEY
        },
        env: process.env.NODE_ENV || 'production'
    });
});

app.get('/ping', (req, res) => res.json({ status: 'pong', timestamp: new Date().toISOString() }));

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || '',
  apiKey: process.env.PAYOS_API_KEY || '',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
});

// Endpoint: Create Payment Link
app.post('/create-payment-link', async (req, res) => {
    try {
        const { amount, description } = req.body;
        if (!amount || amount < 1000) throw new Error("Số tiền tối thiểu là 1,000đ");

        const orderCode = Number(String(Date.now()).slice(-8)); 
        const paymentLinkRequest = {
            orderCode: orderCode,
            amount: Number(amount),
            description: description || "Thanh toan Chon Village",
            cancelUrl: "https://webb-chonnnn.onrender.com",
            returnUrl: "https://webb-chonnnn.onrender.com/checkout.html"
        };

        console.log(">>> [%s] CREATING PAYMENT:", new Date().toISOString(), orderCode);
        const response = await payos.paymentRequests.create(paymentLinkRequest);
        const result = response.data || response;
        res.json(result);
    } catch (error) {
        console.error("Lỗi PayOS Create:", error);
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

// Endpoint: Check Payment Status
app.get('/check-payment/:orderCode', async (req, res) => {
    try {
        const orderCode = req.params.orderCode;
        const orderInfo = await payos.getPaymentLinkInformation(orderCode);
        const result = orderInfo.data || orderInfo;
        res.json({ status: result.status });
    } catch (error) {
        console.error("Lỗi Check Status:", error);
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVER CHON VILLAGE RUNNING ON PORT ${PORT}`);
});