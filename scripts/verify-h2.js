require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const client = require('../src/services/backendClient');
const stock = require('../src/services/stockService');

async function verificar() {
    const nome = `Teste WPP ${Date.now()}`;
    let id;
    try {
        id = await stock.createProductManual({ nome, quantidade: 1, unidade_medida: 'kg', estoque_minimo: 0.5, preco: 10 });
        assert.deepEqual(await stock.processProducts([{ nome, quantidade: 500, unidade_medida: 'g', preco: 0.02 }]), { novos: 0, atualizados: 1 });
        let { data } = await client.get('/insumos');
        let item = data.find((atual) => atual.idInsumo === id);
        assert.equal(item.quantidadeAtual, 1.5);
        assert.equal(item.quantidadeMinima, 0.5);
        assert.equal(item.unidade, 'KG');
        assert.equal(item.custoUnitario, 20);
        assert.equal((await stock.getAllProducts()).find((atual) => atual.id === id).quantidade, 1.5);
        await stock.updateProductManual(id, { nome, quantidade: 2, unidade_medida: 'kg', estoque_minimo: 1, preco: 15 });
        ({ data } = await client.get('/insumos'));
        item = data.find((atual) => atual.idInsumo === id);
        assert.equal(item.quantidadeAtual, 2);
        assert.equal(item.quantidadeMinima, 1);
        console.log('H2/API: cadastro, soma de 500 g em kg, custo, leitura e edição confirmados.');
    } finally {
        if (id) {
            await stock.deleteProduct(id);
            const { data } = await client.get('/insumos');
            assert.equal(data.some((item) => item.idInsumo === id), false);
            console.log('Exclusão do registro temporário confirmada.');
        }
    }
}

verificar().catch((error) => {
    console.error('Falha na verificação:', error.message || error.code || 'Verifique se o back-end está ativo.');
    process.exitCode = 1;
});
