const backendClient = require('./backendClient');

const UNIDADES = {
    KG: { grupo: 'massa', fator: 1000, rotulo: 'kg' },
    G: { grupo: 'massa', fator: 1, rotulo: 'g' },
    L: { grupo: 'volume', fator: 1000, rotulo: 'L' },
    ML: { grupo: 'volume', fator: 1, rotulo: 'ml' },
    UNIDADE: { grupo: 'unidade', fator: 1, rotulo: 'unidades' },
};
const ALIASES = {
    kg: 'KG', quilo: 'KG', quilos: 'KG', quilograma: 'KG', quilogramas: 'KG',
    g: 'G', grama: 'G', gramas: 'G',
    l: 'L', litro: 'L', litros: 'L',
    ml: 'ML', mililitro: 'ML', mililitros: 'ML',
    un: 'UNIDADE', 'un.': 'UNIDADE', und: 'UNIDADE', unidade: 'UNIDADE', unidades: 'UNIDADE',
};

function erroValidacao(mensagem) {
    return Object.assign(new Error(mensagem), { status: 400 });
}

function normalizar(texto) {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function unidade(valor) {
    const chave = normalizar(valor ?? '');
    const resultado = Object.hasOwn(ALIASES, chave) ? ALIASES[chave] : null;
    if (!resultado) throw erroValidacao('Unidade inválida. Use kg, g, L, ml ou unidades.');
    return resultado;
}

function numero(valor, campo) {
    if (!['number', 'string'].includes(typeof valor) || String(valor).trim() === '') {
        throw erroValidacao(`${campo} é obrigatório.`);
    }
    const resultado = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(resultado) || resultado < 0) throw erroValidacao(`${campo} deve ser um número maior ou igual a zero.`);
    return resultado;
}

function nomeValido(valor) {
    if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > 45) {
        throw erroValidacao('O nome do insumo deve ter entre 1 e 45 caracteres.');
    }
    return valor.trim();
}

function validarId(id) {
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw erroValidacao('ID do insumo inválido.');
}

function fatorConversao(origem, destino) {
    if (UNIDADES[origem].grupo !== UNIDADES[destino].grupo) {
        throw erroValidacao(`Não é possível somar ${origem} a um insumo cadastrado em ${destino}. Confira a unidade da nota.`);
    }
    return UNIDADES[origem].fator / UNIDADES[destino].fator;
}

function arredondar(valor, casas = 3) {
    if (!Number.isFinite(valor)) throw erroValidacao('Quantidade ou custo excede o limite permitido.');
    return Number(valor.toFixed(casas));
}

function payloadAtual(item) {
    return {
        nome: item.nome, fkCategoriaInsumo: item.categoriaId,
        quantidadeAtual: Number(item.quantidadeAtual), quantidadeMinima: Number(item.quantidadeMinima),
        unidade: item.unidade, status: item.status || 'ATIVO',
        marca: item.marca ?? null, custoUnitario: item.custoUnitario ?? null,
    };
}

function paraPainel(item) {
    return {
        id: item.idInsumo, nome: item.nome, quantidade: Number(item.quantidadeAtual),
        unidade_medida: UNIDADES[item.unidade].rotulo,
        estoque_minimo: Number(item.quantidadeMinima), preco: item.custoUnitario,
        categoria: item.categoriaNome, categoriaId: item.categoriaId,
    };
}

function createStockService({ client = backendClient } = {}) {
    // Evita que duas notas deste processo sobrescrevam a soma uma da outra.
    let fila = Promise.resolve();
    function serializar(acao) {
        const resultado = fila.then(acao);
        fila = resultado.catch(() => {});
        return resultado;
    }

    async function listar() {
        const { data } = await client.get('/insumos');
        return data || [];
    }

    async function categoriaImportacao() {
        const nome = process.env.BACKEND_IMPORT_CATEGORY || 'Importados WhatsApp';
        const { data } = await client.get('/categorias-insumo');
        const existente = (data || []).find((item) => normalizar(item.nome) === normalizar(nome));
        if (existente) return existente.idCategoriaInsumo;
        try {
            const resposta = await client.post('/categorias-insumo', { nome });
            return resposta.data.idCategoriaInsumo;
        } catch (error) {
            if (error.response?.status !== 409) throw error;
            const resposta = await client.get('/categorias-insumo');
            const criada = resposta.data.find((item) => normalizar(item.nome) === normalizar(nome));
            if (!criada) throw error;
            return criada.idCategoriaInsumo;
        }
    }

    function validarManual(produto, atual) {
        if (!produto || typeof produto !== 'object' || Array.isArray(produto)) throw erroValidacao('Dados do insumo inválidos.');
        const destino = unidade(produto.unidade_medida ?? atual?.unidade);
        const fator = atual ? fatorConversao(atual.unidade, destino) : 1;
        return {
            ...(atual ? payloadAtual(atual) : { status: 'ATIVO', marca: null }),
            nome: nomeValido(produto.nome ?? atual?.nome),
            quantidadeAtual: arredondar(numero(produto.quantidade, 'Quantidade')),
            quantidadeMinima: arredondar(numero(produto.estoque_minimo ?? (atual ? atual.quantidadeMinima * fator : 0), 'Estoque mínimo')),
            unidade: destino,
            custoUnitario: produto.preco == null || produto.preco === ''
                ? (atual?.custoUnitario == null ? null : arredondar(atual.custoUnitario / fator, 4))
                : arredondar(numero(produto.preco, 'Preço unitário'), 4),
        };
    }

    return {
        async getAllProducts() {
            return (await listar()).map(paraPainel).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        },

        processProducts(produtos) {
            return serializar(async () => {
                if (!Array.isArray(produtos) || !produtos.length) throw erroValidacao('A nota não contém insumos para importar.');
                const entradas = produtos.map((item) => {
                    if (!item || typeof item !== 'object') throw erroValidacao('Item inválido na nota.');
                    return {
                        nome: nomeValido(item.nome), quantidade: numero(item.quantidade, 'Quantidade'),
                        unidade: unidade(item.unidade_medida),
                        preco: item.preco == null ? null : numero(item.preco, 'Preço unitário'),
                    };
                });
                const itens = await listar();
                const porNome = new Map();
                for (const item of itens) {
                    const chave = normalizar(item.nome);
                    if (!porNome.has(chave)) porNome.set(chave, []);
                    porNome.get(chave).push(item);
                }
                // Valida todo o lote antes da primeira gravacao.
                const unidadesPorNome = new Map();
                for (const entrada of entradas) {
                    const chave = normalizar(entrada.nome);
                    const encontrados = porNome.get(chave) || [];
                    if (encontrados.length > 1) throw erroValidacao(`Há mais de um insumo chamado ${entrada.nome}. Corrija os cadastros antes de importar.`);
                    const destino = encontrados[0]?.unidade || unidadesPorNome.get(chave) || entrada.unidade;
                    const fator = fatorConversao(entrada.unidade, destino);
                    if (entrada.quantidade > 0 && arredondar(entrada.quantidade * fator) === 0) {
                        throw erroValidacao(`Quantidade de ${entrada.nome} menor que a precisão do estoque (${destino}).`);
                    }
                    unidadesPorNome.set(chave, destino);
                }
                let novos = 0;
                let atualizados = 0;
                let categoriaId;
                for (const entrada of entradas) {
                    const chave = normalizar(entrada.nome);
                    const atual = porNome.get(chave)?.[0];
                    const destino = atual?.unidade || entrada.unidade;
                    const fator = fatorConversao(entrada.unidade, destino);
                    const payload = atual ? payloadAtual(atual) : {
                        nome: entrada.nome, quantidadeAtual: 0, quantidadeMinima: 0,
                        unidade: destino, status: 'ATIVO', marca: null, custoUnitario: null,
                        fkCategoriaInsumo: categoriaId ?? (categoriaId = await categoriaImportacao()),
                    };
                    payload.quantidadeAtual = arredondar(payload.quantidadeAtual + entrada.quantidade * fator);
                    if (entrada.preco !== null) payload.custoUnitario = arredondar(entrada.preco / fator, 4);
                    const resposta = atual
                        ? await client.put(`/insumos/${atual.idInsumo}`, payload)
                        : await client.post('/insumos', payload);
                    porNome.set(chave, [resposta.data]);
                    if (atual) atualizados++; else novos++;
                }
                return { novos, atualizados };
            });
        },

        createProductManual(produto) {
            return serializar(async () => {
                const payload = validarManual(produto);
                payload.fkCategoriaInsumo = await categoriaImportacao();
                const { data } = await client.post('/insumos', payload);
                return data.idInsumo;
            });
        },

        updateProductManual(id, produto) {
            return serializar(async () => {
                validarId(id);
                const atual = (await listar()).find((item) => String(item.idInsumo) === String(id));
                if (!atual) return false;
                await client.put(`/insumos/${atual.idInsumo}`, validarManual(produto, atual));
                return true;
            });
        },

        deleteProduct(id) {
            return serializar(async () => {
                validarId(id);
                try {
                    await client.delete(`/insumos/${id}`);
                    return true;
                } catch (error) {
                    if (error.response?.status === 404) return false;
                    throw error;
                }
            });
        },
    };
}

module.exports = { ...createStockService(), createStockService };
