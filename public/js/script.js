let todosProdutos = [];
let statusAtual = 'todos';

async function buscarEstoque() {
    try {
        const res = await fetch('/api/produtos');
        if (!res.ok) throw new Error((await res.json()).erro || 'Não foi possível carregar o estoque.');
        todosProdutos = await res.json();
        processarKpis();
        atualizarPainel();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

function calcularMetricas(item) {
    const qtd = parseFloat(item.quantidade) || 0;
    const min = parseFloat(item.estoque_minimo) || 0;
    const proporcao = min > 0 ? qtd / min : 1;
    const porcentagem = Math.round(Math.max(0, Math.min(1, proporcao)) * 100);

    let status = 'normal';
    if (proporcao <= 0.5) status = 'critico';
    else if (proporcao < 1) status = 'baixo';

    return { min, porcentagem, status };
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
        
        const rotulo = item.unidade_medida === 'unidades' ? 'un.' : item.unidade_medida;
        const exibicaoQtd = `${item.quantidade} ${rotulo}`;
        const exibicaoMin = `${min} ${rotulo}`;

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
                    <span class="product-name"></span>
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
        tr.querySelector('.product-name').textContent = item.nome;
        tbody.appendChild(tr);
    });
}

function abrirModalCadastro() {
    document.getElementById('insumoForm').reset();
    document.getElementById('insumoId').value = '';
    document.getElementById('modalTitle').innerText = 'Novo Insumo';
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
    document.getElementById('formPreco').value = item.preco;
    

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
        estoque_minimo: parseFloat(document.getElementById('formMinimo').value) || 0
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
        } else {
            alert((await res.json()).erro || 'Não foi possível salvar o insumo.');
        }
    } catch (err) {
        console.error(err);
        alert('Não foi possível salvar o insumo. Verifique a conexão.');
    }
}

async function deletarInsumo(id) {
    if (!confirm('Tem certeza de que deseja remover este item do estoque?')) return;
    try {
        const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
        if (res.ok) buscarEstoque();
        else alert((await res.json()).erro || 'Não foi possível excluir o insumo.');
    } catch (err) {
        console.error(err);
        alert('Não foi possível excluir o insumo. Verifique a conexão.');
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
