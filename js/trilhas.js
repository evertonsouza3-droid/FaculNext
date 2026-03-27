document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    
    try {
        const res = await fetch(`http://localhost:3000/api/trilhas/user/${userId}`);
        const data = await res.json();
        
        if (data.sucesso) {
            const grid = document.querySelector('.trilhas-grid');
            if(grid) {
                grid.innerHTML = ''; // Limpar mockups
                
                data.trilhas.forEach(trilha => {
                    const html = `
                    <div class="glass-card trilha-card">
                        <div class="trilha-header" style="background-image: linear-gradient(135deg, var(--neon-${trilha.cor}) 10%, transparent);">
                            <h2>${trilha.titulo}</h2>
                            <span class="badge badge-${trilha.cor}">${trilha.status}</span>
                        </div>
                        <div class="trilha-body">
                            <p>${trilha.desc}</p>
                            <div class="trilha-stats">
                                <span><strong>${trilha.aulas}</strong> Aulas</span>
                                <span><strong>${trilha.ex}</strong> Exercícios</span>
                            </div>
                            <div class="progress-bar mt-2">
                                <div class="progress" style="width: ${trilha.progresso}%; background: var(--neon-${trilha.cor}); box-shadow: 0 0 10px var(--neon-${trilha.cor});"></div>
                            </div>
                        </div>
                        <button class="btn-${trilha.progresso > 0 ? 'primary' : 'secondary'} btn-block">${trilha.progresso > 0 ? 'Continuar' : 'Iniciar'}</button>
                    </div>`;
                    grid.innerHTML += html;
                });
            }
        }
    } catch (e) {
        console.error('Erro ao carregar Trilhas:', e);
    }
});
