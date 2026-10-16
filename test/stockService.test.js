const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStockService } = require('../src/services/stockService');

function ambiente(iniciais = []) {
    let itens = structuredClone(iniciais);
    const categorias = [{ idCategoriaInsumo: 1, nome: 'Base' }];
    const escritas = [];
    let proximo = 100;
    const clonar = (data) => ({ data: structuredClone(data) });
    const client = {
        async get(path) { return clonar(path === '/insumos' ? itens : categorias); },
        async post(path, payload) {
            escritas.push({ path, payload: structuredClone(payload) });
            if (path === '/categorias-insumo') {
                const categoria = { idCategoriaInsumo: 2, ...payload };
                categorias.push(categoria);
                return clonar(categoria);
            }
            const item = { ...payload, idInsumo: proximo++, categoriaId: payload.fkCategoriaInsumo, categoriaNome: 'Importados WhatsApp' };
            itens.push(item);
            return clonar(item);
        },
        async put(path, payload) {
            escritas.push({ path, payload: structuredClone(payload) });
            const id = Number(path.split('/').pop());
            const item = { ...payload, idInsumo: id, categoriaId: payload.fkCategoriaInsumo, categoriaNome: 'Base' };
            itens = itens.map((atual) => atual.idInsumo === id ? item : atual);
            return clonar(item);
        },
        async delete(path) {
            const id = Number(path.split('/').pop());
            if (!itens.some((item) => item.idInsumo === id)) throw { response: { status: 404 } };
            itens = itens.filter((item) => item.idInsumo !== id);
        },
    };
    return { service: createStockService({ client }), client, escritas, itens: () => itens, categorias };
}

const farinha = {
    idInsumo: 1, nome: 'Farinha de Trigo', categoriaId: 1, categoriaNome: 'Base',
    quantidadeAtual: 12, quantidadeMinima: 5, unidade: 'KG', status: 'ATIVO', marca: 'Marca original', custoUnitario: 8,
};

test('soma g em kg e converte custo, preservando os campos existentes', async () => {
    const a = ambiente([farinha]);
    assert.deepEqual(await a.service.processProducts([{ nome: ' FARINHA  DE TRIGO ', quantidade: 500, unidade_medida: 'g', preco: 0.01 }]), { novos: 0, atualizados: 1 });
    assert.deepEqual(a.escritas[0].payload, {
        nome: farinha.nome, fkCategoriaInsumo: 1, quantidadeAtual: 12.5, quantidadeMinima: 5,
        unidade: 'KG', status: 'ATIVO', marca: farinha.marca, custoUnitario: 10,
    });
});

test('cria categoria e insumo, e acumula nomes repetidos no mesmo lote', async () => {
    const a = ambiente();
    const resultado = await a.service.processProducts([
        { nome: 'Açúcar', quantidade: 1, unidade_medida: 'kg', preco: 6 },
        { nome: 'ACUCAR', quantidade: 500, unidade_medida: 'g' },
    ]);
    assert.deepEqual(resultado, { novos: 1, atualizados: 1 });
    assert.equal(a.itens().length, 1);
    assert.equal(a.itens()[0].quantidadeAtual, 1.5);
    assert.equal(a.itens()[0].custoUnitario, 6);
    assert.equal(a.itens()[0].quantidadeMinima, 0);
    assert.equal(a.itens()[0].categoriaId, 2);
    assert.equal(a.categorias.length, 2);
});

test('converte litros para ml e reconhece unidades em portugues', async () => {
    const a = ambiente([{ ...farinha, nome: 'Leite', unidade: 'ML', quantidadeAtual: 300 }]);
    await a.service.processProducts([{ nome: 'leite', quantidade: 2, unidade_medida: 'litros', preco: 5 }]);
    assert.equal(a.itens()[0].quantidadeAtual, 2300);
    assert.equal(a.itens()[0].custoUnitario, 0.005);
});

test('rejeita lote com unidades incompatíveis antes de gravar qualquer item', async () => {
    const a = ambiente([farinha]);
    await assert.rejects(a.service.processProducts([
        { nome: 'Novo', quantidade: 1, unidade_medida: 'unidades' },
        { nome: farinha.nome, quantidade: 1, unidade_medida: 'L' },
    ]), { status: 400 });
    assert.equal(a.escritas.length, 0);
});

test('rejeita dados inválidos, nomes ambiguos e quantidades menores que a precisao', async () => {
    const a = ambiente([farinha]);
    for (const dados of [null, [], [{ nome: 'Item', quantidade: -1, unidade_medida: 'g' }],
        [{ nome: '', quantidade: 1, unidade_medida: 'g' }],
        [{ nome: 'Item', quantidade: '', unidade_medida: 'g' }],
        [{ nome: 'Item', quantidade: 1, unidade_medida: 'constructor' }],
        [{ nome: farinha.nome, quantidade: 0.1, unidade_medida: 'g' }]]) {
        await assert.rejects(a.service.processProducts(dados), { status: 400 });
    }
    const duplicados = ambiente([farinha, { ...farinha, idInsumo: 2, nome: 'FARINHA DE TRIGO' }]);
    await assert.rejects(duplicados.service.processProducts([{ nome: farinha.nome, quantidade: 1, unidade_medida: 'kg' }]), /mais de um insumo/);
    assert.equal(a.escritas.length, 0);
    assert.equal(duplicados.escritas.length, 0);
});

test('serializa importações simultâneas sem perder as somas', async () => {
    const a = ambiente([farinha]);
    await Promise.all(Array.from({ length: 5 }, () => a.service.processProducts([{ nome: farinha.nome, quantidade: 1, unidade_medida: 'kg' }])));
    assert.equal(a.itens()[0].quantidadeAtual, 17);
});

test('CRUD manual e listagem usam IDs e campos do back-end', async () => {
    const a = ambiente([farinha]);
    const lista = await a.service.getAllProducts();
    assert.equal(lista[0].id, 1);
    assert.equal(lista[0].unidade_medida, 'kg');
    assert.equal(lista[0].estoque_minimo, 5);
    const id = await a.service.createProductManual({ nome: 'Ovos', quantidade: 12, unidade_medida: 'unidades', estoque_minimo: 6, preco: '0,75' });
    assert.equal(id, 100);
    assert.equal(a.itens()[1].custoUnitario, 0.75);
    assert.equal(await a.service.updateProductManual(1, { nome: farinha.nome, quantidade: 14000, unidade_medida: 'g' }), true);
    assert.equal(a.itens()[0].quantidadeMinima, 5000);
    assert.equal(a.itens()[0].custoUnitario, 0.008);
    assert.equal(a.itens()[0].marca, farinha.marca);
    assert.equal(await a.service.updateProductManual(999, {}), false);
    assert.equal(await a.service.deleteProduct(id), true);
    assert.equal(await a.service.deleteProduct(id), false);
    await assert.rejects(a.service.deleteProduct('../'), { status: 400 });
});

test('propaga falha do back-end e permite nova operacao depois da falha', async () => {
    const a = ambiente([farinha]);
    const put = a.client.put;
    a.client.put = async () => { throw new Error('API indisponivel'); };
    const entrada = [{ nome: farinha.nome, quantidade: 1, unidade_medida: 'kg' }];
    await assert.rejects(a.service.processProducts(entrada), /API indisponivel/);
    a.client.put = put;
    await a.service.processProducts(entrada);
    assert.equal(a.itens()[0].quantidadeAtual, 13);
});
