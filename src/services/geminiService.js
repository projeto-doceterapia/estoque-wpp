const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const downloadImageAsBase64 = async (mediaUrl) => {
    const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN
        }
    });
    return Buffer.from(response.data, 'binary').toString('base64');
};

exports.analyzeReceipt = async (mediaUrl) => {
    const base64Image = await downloadImageAsBase64(mediaUrl);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Analise esta nota fiscal e retorne EXATAMENTE um JSON, sem blocos de código markdown (\`\`\`).
    
    Regras:
    1. DATA: Encontre a data da compra no formato YYYY-MM-DD.
    2. CONVERSÃO: Se o item tiver KG, multiplique a quantidade por 1000 e use unidade_medida 'g'. Se for L, multiplique por 1000 e use 'ml'. Senão, use 'unidades'.
    3. NOMES GENÉRICOS: Remova marcas. "ARROZ TIO JOÃO" deve virar "ARROZ". Se o produto for conhecido pela marca (ex: "COCA-COLA"), converta para "REFRIGERANTE".
    4. PREÇO: Use ponto decimal para o valor unitário.
    
    Formato obrigatório:
    {
      "data_compra": "YYYY-MM-DD",
      "produtos": [
        { "nome": "TEXTO", "quantidade": 1000, "unidade_medida": "g", "preco": 10.50 }
      ]
    }
    `;

    const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);

    let responseText = result.response.text().trim();
    
    if (responseText.startsWith('```json')) {
        responseText = responseText.replace('```json', '').replace('```', '').trim();
    } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/```/g, '').trim();
    }

    return JSON.parse(responseText);
};