let todosProdutos = [];
let statusAtual = 'todos';

async function buscarEstoque() {
    try {
        const res = await fetch('/api/produtos');
        todosProdutos = await res.json();
        processarKpis();
        atualizarPainel();
    } catch (err) {
        console.error(err);
    }
}

function calcularMetricas(item) {
    const qtd = parseFloat(item.quantidade) || 0;
    let min = parseFloat(item.estoque_minimo) || 0;
    let max = parseFloat(item.estoque_maximo) || 0;

    if (min === 0) {
        if (item.unidade_medida === 'g') min = 3000;
        else if (item.unidade_medida === 'ml') min = 2000;
        else min = 10;
    }
    if (max === 0) max = min * 2;

    let porcentagem = Math.round((qtd / max) * 100);
    if (porcentagem > 100) porcentagem = 100;
    if (porcentagem < 0 || isNaN(porcentagem)) porcentagem = 0;

    let status = 'normal';
    if (qtd <= min * 0.5) status = 'critico';
    else if (qtd <= min) status = 'baixo';

    return { min, max, porcentagem, status };
}

function processarKpis() {
    let n = 0, b = 0, c = 0;
    todosProdutos.forEach(item => {
        const { status } = calcularMetricas(item);
        if (status === 'normal') n++;
        if (status === 'baixo') b++;
        if (status === 'critico') c++;
    });
    document.getElementById('kpiTotal').innerText = todosProdutos.length;
    document.getElementById('kpiNormal').innerText = n;
    document.getElementById('kpiBaixo').innerText = b;
    document.getElementById('kpiCritico').innerText = c;
}

function atualizarPainel() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const termoBusca = document.getElementById('searchInput').value.toLowerCase();

    const filtrados = todosProdutos.filter(item => {
        const { status } = calcularMetricas(item);
        return item.nome.toLowerCase().includes(termoBusca) && (statusAtual === 'todos' || status === statusAtual);
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 32px; color: #9ca3af; background-color: #fafaf9;">Nenhum insumo mapeado neste filtro.</td></tr>`;
        return;
    }

    filtrados.forEach(item => {
        const { min, porcentagem, status } = calcularMetricas(item);
        
        let exibicaoQtd = `${item.quantidade} un.`;
        let exibicaoMin = `${min} un.`;
        if (item.unidade_medida === 'g') { 
            exibicaoQtd = `${(item.quantidade/1000).toFixed(1)} kg`; 
            exibicaoMin = `${(min/1000).toFixed(1)} kg`; 
        } else if (item.unidade_medida === 'ml') { 
            exibicaoQtd = `${(item.quantidade/1000).toFixed(1)} L`; 
            exibicaoMin = `${(min/1000).toFixed(1)} L`; 
        }

        let labelStatus = `<i class="fa-regular fa-circle-check" style="margin-right: 4px;"></i> Normal`;
        if (status === 'baixo') { 
            labelStatus = `<i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px;"></i> Baixo`; 
        } else if (status === 'critico') { 
            labelStatus = `<i class="fa-solid fa-circle-xmark" style="margin-right: 4px;"></i> Crítico`; 
        }

        const tr = document.createElement('tr');
        tr.className = "product-row";
        tr.innerHTML = `
            <td>
                <div class="product-info-cell">
                    <span class="product-icon-box ${status}"><i class="fa-solid fa-cookie-bite"></i></span>
                    <span class="product-name">${item.nome}</span>
                </div>
            </td>
            <td class="font-bold">${exibicaoQtd}</td>
            <td class="text-gray-300">${exibicaoMin}</td>
            <td>
                <div class="progress-wrapper">
                    <div class="progress-bg">
                        <div class="progress-bar ${status}" style="width: ${porcentagem}%"></div>
                    </div>
                    <span class="progress-text">${porcentagem}%</span>
                </div>
            </td>
            <td><span class="status-badge ${status}">${labelStatus}</span></td>
            <td class="actions-cell">
                <button onclick="abrirModalEdicao(${item.id})" class="action-btn edit"><i class="fa-regular fa-pen-to-square"></i></button>
                <button onclick="deletarInsumo(${item.id})" class="action-btn delete"><i class="fa-regular fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalCadastro() {
    document.getElementById('insumoForm').reset();
    document.getElementById('insumoId').value = '';
    document.getElementById('modalTitle').innerText = 'Novo Insumo';
    document.getElementById('formData').value = new Date().toISOString().split('T')[0];
    document.getElementById('insumoModal').classList.remove('hidden');
}

function abrirModalEdicao(id) {
    const item = todosProdutos.find(p => p.id === id);
    if (!item) return;

    document.getElementById('insumoId').value = item.id;
    document.getElementById('formNome').value = item.nome;
    document.getElementById('formQuantidade').value = item.quantidade;
    document.getElementById('formUnidade').value = item.unidade_medida;
    document.getElementById('formMinimo').value = item.estoque_minimo || 0;
    document.getElementById('formMaximo').value = item.estoque_maximo || 0;
    document.getElementById('formPreco').value = item.preco;
    
    if (item.data_compra) {
        document.getElementById('formData').value = new Date(item.data_compra).toISOString().split('T')[0];
    }

    document.getElementById('modalTitle').innerText = 'Editar Insumo';
    document.getElementById('insumoModal').classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('insumoModal').classList.add('hidden');
}

async function salvarInsumo(e) {
    e.preventDefault();
    const id = document.getElementById('insumoId').value;
    
    const payload = {
        nome: document.getElementById('formNome').value,
        quantidade: parseFloat(document.getElementById('formQuantidade').value),
        unidade_medida: document.getElementById('formUnidade').value,
        preco: parseFloat(document.getElementById('formPreco').value),
        data_compra: document.getElementById('formData').value,
        estoque_minimo: parseFloat(document.getElementById('formMinimo').value) || 0,
        estoque_maximo: parseFloat(document.getElementById('formMaximo').value) || 0
    };

    const url = id ? `/api/produtos/${id}` : '/api/produtos';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            fecharModal();
            buscarEstoque();
        }
    } catch (err) {
        console.error(err);
    }
}

async function deletarInsumo(id) {
    if (!confirm('Tem certeza de que deseja remover este item do estoque?')) return;
    try {
        const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
        if (res.ok) buscarEstoque();
    } catch (err) {
        console.error(err);
    }
}

function filtrarPorStatus(status) {
    statusAtual = status;
    ['todos', 'normal', 'baixo', 'critico'].forEach(id => {
        document.getElementById(`btnTab-${id}`).className = "tab-btn";
    });
    document.getElementById(`btnTab-${status}`).className = "tab-btn tab-active";
    atualizarPainel();
}

document.getElementById('searchInput').addEventListener('input', atualizarPainel);

buscarEstoque();