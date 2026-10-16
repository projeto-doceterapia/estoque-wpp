require('dotenv').config();
const express = require('express');
const webhookController = require('./src/controllers/webhookController');
const stockService = require('./src/services/stockService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

function responderErro(res, error) {
    const statusBackend = error.response?.status;
    const statusLocal = !error.isAxiosError && error.status;
    const status = statusLocal || ([400, 404, 409, 422].includes(statusBackend) ? statusBackend : 502);
    const mensagem = statusLocal ? error.message
        : status === 502 ? 'Não foi possível acessar o estoque no back-end. Verifique se a API está disponível.'
        : error.response?.data?.message || error.response?.data?.mensagem || 'O back-end recusou a operação. Confira os dados.';
    res.status(status).json({ erro: mensagem });
}

app.post('/webhook', webhookController.handleWebhook);

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await stockService.getAllProducts();
        res.json(produtos);
    } catch (error) {
        responderErro(res, error);
    }
});

app.post('/api/produtos', async (req, res) => {
    try {
        const novoId = await stockService.createProductManual(req.body);
        res.status(201).json({ mensagem: 'Produto criado!', id: novoId });
    } catch (error) {
        responderErro(res, error);
    }
});

app.put('/api/produtos/:id', async (req, res) => {
    try {
        const modificado = await stockService.updateProductManual(req.params.id, req.body);
        if (modificado) res.json({ mensagem: 'Produto atualizado com sucesso!' });
        else res.status(404).json({ erro: 'Produto não encontrado' });
    } catch (error) {
        responderErro(res, error);
    }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        const excluido = await stockService.deleteProduct(req.params.id);
        if (excluido) res.json({ mensagem: 'Produto deletado!' });
        else res.status(404).json({ erro: 'Produto não encontrado' });
    } catch (error) {
        responderErro(res, error);
    }
});

app.listen(PORT, () => {
  console.log(`Servidor(Gemini) rodando na porta ${PORT}`);
});
