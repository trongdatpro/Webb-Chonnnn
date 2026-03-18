const express = require('express');
const cors = require('cors');
const { PayOS } = require('@payos/node'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// Diagnostics
app.get('/diagnostics', (req, res) => {
    res.json({
        status: 'online',
        port_env: process.env.PORT || 'not set',
        keys: {
            clientId: !!process.env.PAYOS_CLIENT_ID,
            apiKey: !!process.env.PAYOS_API_KEY,
            checksumKey: !!process.env.PAYOS_CHECKSUM_KEY
        }
    });
});

app.get('/ping', (req, res) => res.json({ status: 'pong' }));

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || '',
  apiKey: process.env.PAYOS_API_KEY || '',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
});

app.post('/create-payment-link', async (req, res) => {
    try {
        const { amount, description } = req.body;
        if (!amount || amount < 1000) throw new Error("Số tiền tối thiểu là 1,000đ");
        const orderCode = Number(String(Date.now()).slice(-8)); 
        const response = await payos.paymentRequests.create({
            orderCode,
            amount: Number(amount),
            description: description || "Thanh toan Chon Village",
            cancelUrl: "https://webb-chonnnn.onrender.com",
            returnUrl: "https://webb-chonnnn.onrender.com/checkout.html"
        });
        res.json(response.data || response);
    } catch (error) {
        console.error("PayOS Error:", error);
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

app.get('/check-payment/:orderCode', async (req, res) => {
    try {
        const info = await payos.getPaymentLinkInformation(req.params.orderCode);
        const data = info.data || info;
        res.json({ status: data.status });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

// Use PORT from Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log("-----------------------------------------");
    console.log(`🚀 SERVER IS UP ON PORT: ${PORT}`);
    console.log(`>>> ENV PORT WAS: ${process.env.PORT || 'UNDEFINED'}`);
    console.log("-----------------------------------------");
});