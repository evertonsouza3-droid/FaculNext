document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    
    // Atualiza o saldo de cashback no sidebar
    const cashbackLocal = localStorage.getItem('faculnext_cashback');
    if (cashbackLocal) {
        const valEl = document.getElementById('cashback-value');
        if (valEl) valEl.innerText = `R$ ${cashbackLocal}`;
    }
    
    try {
        // CORRIGIDO: Removido http://localhost:3000 para usar caminho relativo
        const res = await fetch(`/api/trilhas/user/${userId}`);
        const data = await res.json();
        
        if (data.sucesso) {
            const grid = document.querySelector('.trilhas-grid');
            if(grid) {
                grid.innerHTML = ''; // Limpar mockups
                
                // Mapeamento de cores para a nova paleta do site
                const colorMap = {
                    'lime': '#00c864',
                    'purple': '#8a2be2',
                    'cyan': '#00ffff'
                };
                
                data.trilhas.forEach((trilha, index) => {
                    const colorHex = colorMap[trilha.cor] || 'var(--primary-red)';
                    const animationDelay = index * 100;
                    
                    const html = `
                    <div class="glass-card trilha-card" style="animation: fadeInUp 0.4s ease forwards; animation-delay: ${animationDelay}ms; opacity: 0; transform: translateY(20px);">
                        <div class="trilha-header" style="background-image: linear-gradient(135deg, rgba(229, 9, 20, 0.15) 10%, transparent); border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <h2 style="font-size: 1.5rem; color: #fff;">${trilha.titulo}</h2>
                            <span class="badge" style="background: ${trilha.progresso > 0 ? 'var(--primary-red)' : 'rgba(255,255,255,0.1)'}; color: #fff;">${trilha.status}</span>
                        </div>
                        <div class="trilha-body" style="padding: 24px;">
                            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5;">${trilha.desc}</p>
                            <div class="trilha-stats" style="display: flex; gap: 20px; margin-bottom: 20px;">
                                <span style="font-size: 0.85rem; color: #fff;"><strong style="color: ${colorHex};">${trilha.aulas}</strong> Aulas</span>
                                <span style="font-size: 0.85rem; color: #fff;"><strong style="color: ${colorHex};">${trilha.ex}</strong> Exercícios</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Progresso</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color: #fff;">${trilha.progresso}%</span>
                            </div>
                            <div class="progress-bar mt-2" style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
                                <div class="progress" style="height: 100%; width: ${trilha.progresso}%; background: ${trilha.progresso > 0 ? colorHex : 'transparent'}; box-shadow: ${trilha.progresso > 0 ? '0 0 10px '+colorHex : 'none'}; transition: width 1s ease-in-out;"></div>
                            </div>
                            <button class="${trilha.progresso > 0 ? 'btn-primary' : 'btn-secondary'} btn-block" style="width: 100%;" onclick="alert('Módulo em desenvolvimento! 🚧')">${trilha.progresso > 0 ? 'Continuar Trilha ➔' : 'Iniciar Trilha'}</button>
                        </div>
                    </div>`;
                    grid.insertAdjacentHTML('beforeend', html);
                });
            }
        }
    } catch (e) {
        console.error('Erro ao carregar Trilhas:', e);
        // Fallback visual caso a API falhe
    }
});
