require('dotenv').config();
const express = require('express');
const webhookController = require('./src/controllers/webhookController');
const stockService = require('./src/services/stockService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/webhook', webhookController.handleWebhook);

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await stockService.getAllProducts();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ erro: 'Falha ao buscar dados' });
    }
});

app.post('/api/produtos', async (req, res) => {
    try {
        const novoId = await stockService.createProductManual(req.body);
        res.status(201).json({ mensagem: 'Produto criado!', id: novoId });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao criar produto' });
    }
});

app.put('/api/produtos/:id', async (req, res) => {
    try {
        const modificado = await stockService.updateProductManual(req.params.id, req.body);
        if (modificado) res.json({ mensagem: 'Produto atualizado com sucesso!' });
        else res.status(404).json({ erro: 'Produto não encontrado' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar produto' });
    }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        const excluido = await stockService.deleteProduct(req.params.id);
        if (excluido) res.json({ mensagem: 'Produto deletado!' });
        else res.status(404).json({ erro: 'Produto não encontrado' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao deletar produto' });
    }
});

app.listen(PORT, () => {
  console.log(`Servidor(Gemini) rodando na porta ${PORT}`);
});