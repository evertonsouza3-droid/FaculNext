document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    
    try {
        const res = await fetch(`/api/users/${userId}/dashboard`);
        const data = await res.json();
        renderDashboard(data);
    } catch (e) {
        console.warn('Backend offline, carregando MOCK de demonstração...');
        const urlParams = new URLSearchParams(window.location.search);
        const mockAge = parseInt(urlParams.get('age')) || 17;

        // Mock de demonstração para o Fundador ver a solução de Cashback
        const mockData = {
            sucesso: true,
            perfil: 'Medicina',
            questoes_resolvidas: 1205,
            ranking_percentil: 5,
            dias_enem: 245,
            cashback_saldo: 0.0,
            idade: mockAge,
            trilha_continuidade: {
                materia: 'Biologia: Genética e Evolução',
                progresso: 75,
                aulas_restantes: 2
            },
            tarefas_hoje: [
                { id: 1, texto: 'Revisão de Matemática', concluida: true, recompensa: 0.50 },
                { id: 2, texto: 'Simulado Rápido de História', concluida: false, prioridade: true, recompensa: 1.00 },
                { id: 3, texto: 'Ler tema da Redação', concluida: false, recompensa: 0.25 }
            ],
            conquistas: [
                { id: 1, icone: '🔥', nome: '7 Dias de Fogo', desc: 'Estudou a semana toda sem parar.' },
                { id: 2, icone: '✍️', nome: 'Escritor Ágil', desc: 'Fez uma redação em menos de 1h.' }
            ],
            evolucao_semanal: [45, 52, 48, 70, 85, 92, 88]
        };
        renderDashboard(mockData);
    }

    function renderDashboard(data) {
        if (!data.sucesso) return;

        // Atualizar Stats
        const resolvedElems = document.querySelectorAll('.stat strong');
        if(resolvedElems.length >= 2) {
            resolvedElems[0].innerText = data.questoes_resolvidas.toLocaleString('pt-BR');
            resolvedElems[1].innerText = `Top ${data.ranking_percentil}%`;
        }

        // Atualizar Cashback
        const cashbackValue = document.getElementById('cashback-value');
        if(cashbackValue) cashbackValue.innerText = `R$ ${data.cashback_saldo.toFixed(2)}`;
        // Salva no localStorage para sincronizar com outras páginas
        localStorage.setItem('faculnext_cashback', data.cashback_saldo.toFixed(2));
        if (typeof syncCashback === 'function') syncCashback();

        // Atualizar Título Perfil na Header
        const profileBadgeSpan = document.querySelector('.user-info span');
        if(profileBadgeSpan) profileBadgeSpan.innerText = `Plano ${data.plano_ativo || 'Premium'} • Foco: ${data.perfil}`;

        // Atualizar Dias
        const diasSpan = document.querySelector('.countdown .days');
        if(diasSpan) diasSpan.innerText = data.dias_enem;

        // Atualizar Trilha Continuidade
        const tMateria = document.querySelector('.activity-details h3');
        const tProgresso = document.querySelector('.activity-details .progress');
        const tRestante = document.querySelector('.activity-details span');
        
        if(tMateria) tMateria.innerText = data.trilha_continuidade.materia;
        if(tProgresso) tProgresso.style.width = `${data.trilha_continuidade.progresso}%`;
        if(tRestante) tRestante.innerText = `Faltam ${data.trilha_continuidade.aulas_restantes} aulas pra finalizar`;

        // Populando Tarefas
        const taskList = document.querySelector('.task-list');
        if(taskList) {
            taskList.innerHTML = data.tarefas_hoje.map(t => `
                <li class="task-item">
                    <input type="checkbox" id="task-${t.id}" ${t.concluida ? 'checked disabled' : ''} data-recompensa="${t.recompensa}">
                    <label for="task-${t.id}">${t.texto}</label>
                    ${t.prioridade ? '<span class="urgency">Urgente</span>' : ''}
                    ${!t.concluida ? `<span class="reward-tag">+ R$ ${t.recompensa.toFixed(2)}</span>` : ''}
                </li>
            `).join('');
        }

        // FASE X: Populando Conquistas (Badges)
        const badgesContainer = document.getElementById('badges-container');
        if (badgesContainer && data.conquistas) {
            badgesContainer.innerHTML = data.conquistas.map(b => `
                <div class="badge-card">
                    <span class="badge-icon">${b.icone}</span>
                    <strong>${b.nome}</strong>
                    <span>${b.desc}</span>
                </div>
            `).join('');
        }

        // FASE X: Populando Gráfico de Evolução
        const chartContainer = document.getElementById('evolution-chart');
        if (chartContainer && data.evolucao_semanal) {
            chartContainer.innerHTML = data.evolucao_semanal.map((val, i) => `
                <div class="chart-bar" style="height: ${val}%" title="Dia ${i+1}: ${val} pts"></div>
            `).join('');
        }
    }

    // Event Delegation para Checkboxes de Cashback
    document.addEventListener('change', async (e) => {
        if (e.target.matches('.task-list input[type="checkbox"]') && e.target.checked) {
            const valor = parseFloat(e.target.dataset.recompensa);
            if (valor > 0) {
                try {
                    const res = await fetch(`/api/users/${userId}/cashback/claim`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ valor })
                    });
                    const d = await res.json();
                    if (d.sucesso) {
                        showToast(`💰 Missão Cumprida! +R$ ${valor.toFixed(2)} de cashback!`);
                        // Refresh balance (Try API, fall back to simulated add)
                        try {
                            const balanceRes = await fetch(`/api/users/${userId}/dashboard`);
                            const balanceData = await balanceRes.json();
                            document.getElementById('cashback-value').innerText = `R$ ${balanceData.cashback_saldo.toFixed(2)}`;
                        } catch (err) {
                            const currentVal = parseFloat(document.getElementById('cashback-value').innerText.replace('R$ ', ''));
                            document.getElementById('cashback-value').innerText = `R$ ${(currentVal + valor).toFixed(2)}`;
                        }
                        e.target.disabled = true; // Evitar duplo claim
                    }
                } catch (err) {
                    // MOCK: Mesmo sem backend, vamos simular o ganho no Front para demonstração
                    showToast(`💰 Missão Cumprida! +R$ ${valor.toFixed(2)} de cashback!`);
                    const currentVal = parseFloat(document.getElementById('cashback-value').innerText.replace('R$ ', ''));
                    document.getElementById('cashback-value').innerText = `R$ ${(currentVal + valor).toFixed(2)}`;
                    e.target.disabled = true;
                }
            }
        }
    });
});

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
