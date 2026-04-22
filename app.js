require('dotenv').config();
const express = require('express');
const webhookController = require('./src/controllers/webhookController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/webhook', webhookController.handleWebhook);

app.listen(PORT, () => {
  console.log(`🚀 Servidor V2 (Gemini) rodando na porta ${PORT}`);
});