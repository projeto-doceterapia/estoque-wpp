const db = require('../database/db');

exports.processProducts = async (produtos) => {
    let novos = 0;
    let atualizados = 0;

    for (let i = 0; i < produtos.length; i++) {
        const item = produtos[i];
        
        const nome = item.nome || 'Produto Desconhecido';
        const quantidade = item.quantidade || 0;
        const unidade_medida = item.unidade_medida || 'unidades';
        const preco = item.preco || 0;
        const data_compra = item.data_compra || null;
        const [rows] = await db.execute('SELECT * FROM produtos WHERE LOWER(nome) = LOWER(?)', [nome]);
        
        if (rows.length > 0) {
            await db.execute(
                'UPDATE produtos SET quantidade = quantidade + ?, preco = ?, data_compra = ? WHERE LOWER(nome) = LOWER(?)',
                [quantidade, preco, data_compra, nome]
            );
            atualizados++;
        } else {
            await db.execute(
                'INSERT INTO produtos (nome, quantidade, unidade_medida, preco, data_compra) VALUES (?, ?, ?, ?, ?)',
                [nome, quantidade, unidade_medida, preco, data_compra]
            );
            novos++;
        }
    }

    return { novos, atualizados };
};