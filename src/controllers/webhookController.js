const twilio = require('twilio');
const geminiService = require('../services/geminiService');
const stockService = require('../services/stockService');

exports.handleWebhook = (req, res) => {
    const { NumMedia, MediaUrl0, From } = req.body;
    const twiml = new twilio.twiml.MessagingResponse();

    if (NumMedia === '0' || !MediaUrl0) {
        twiml.message('Por favor, envie uma foto da nota fiscal.');
        return res.type('text/xml').send(twiml.toString());
    }

    twiml.message('Nota recebida! A IA está processando...');
    res.type('text/xml').send(twiml.toString());

    processarNota(MediaUrl0, From);
};

async function processarNota(mediaUrl, senderNumber) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    try {
        console.log(`[Gemini] Analisando imagem...`);
        const data = await geminiService.analyzeReceipt(mediaUrl);

        console.log(`[Banco] Atualizando estoque...`);
        const resultados = await stockService.processProducts(data.produtos);

        const msg = `Estoque Atualizado!\n📦 Total: ${resultados.novos + resultados.atualizados}\n🆕 Novos: ${resultados.novos}\n🔄 Somados: ${resultados.atualizados}`;
        
        await client.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: senderNumber, body: msg });
        console.log(`[Sucesso] Processo concluído!`);

    } catch (error) {
        console.error(`[Erro] Falha no fluxo:`, error);
        await client.messages.create({ 
            from: process.env.TWILIO_WHATSAPP_NUMBER, 
            to: senderNumber, 
            body: "Ops! Ocorreu um erro ao processar sua nota fiscal." 
        });
    }
}