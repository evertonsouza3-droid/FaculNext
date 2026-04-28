document.addEventListener('DOMContentLoaded', async () => {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    const userId = localStorage.getItem('faculnext_user_id') || 1;

    try {
        const res = await fetch('/api/ranking');
        const data = await res.json();
        if (!data.sucesso) throw new Error('API sem sucesso');
        renderRanking(data.jogadores, userId);
    } catch (e) {
        console.warn('API de ranking offline, carregando dados demo...');
        // Fallback com dados demo
        const demo = [
            { id: 101, nome: "Ana Beatriz", avatar: "👩‍🔬", regiao: "SP", pontos: 14500, isMe: false },
            { id: 102, nome: "Carlos Eduardo", avatar: "👨‍💻", regiao: "RJ", pontos: 13200, isMe: false },
            { id: 103, nome: "Mariana Silva", avatar: "👩‍⚕️", regiao: "PR", pontos: 12950, isMe: false },
            { id: userId || 1, nome: "Estudante (Você)", avatar: "👨‍🎓", regiao: "MG", pontos: 11800, isMe: true },
            { id: 104, nome: "João Pedro", avatar: "👨‍⚖️", regiao: "BA", pontos: 11200, isMe: false },
            { id: 105, nome: "Fernanda Costa", avatar: "👩‍🏫", regiao: "RS", pontos: 10500, isMe: false },
            { id: 106, nome: "Lucas Rocha", avatar: "👨‍🎨", regiao: "PE", pontos: 9800, isMe: false }
        ];
        renderRanking(demo, userId);
    }
});

function renderRanking(jogadores, myUserId) {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '';

    jogadores.forEach((jogador, index) => {
        const position = index + 1;
        let posClass = '';
        let medalha = `${position}º`;
        if (position === 1) { posClass = 'top1'; medalha = '🥇'; }
        else if (position === 2) { posClass = 'top2'; medalha = '🥈'; }
        else if (position === 3) { posClass = 'top3'; medalha = '🥉'; }

        const isMe = jogador.isMe || String(jogador.id) === String(myUserId);

        const item = document.createElement('li');
        item.className = `rank-item ${isMe ? 'is-me' : ''}`;
        item.innerHTML = `
            <div class="r-position ${posClass}">${medalha}</div>
            <div class="r-user">
                <div class="r-avatar">${jogador.avatar}</div>
                <span>${jogador.nome}${isMe ? ' <strong style="color:var(--primary-red);font-size:0.75rem; margin-left:5px;">• VOCÊ</strong>' : ''}</span>
                <span class="r-region">${jogador.regiao}</span>
            </div>
            <div class="r-points">${Number(jogador.pontos).toLocaleString('pt-BR')} pts</div>
        `;
        rankingList.appendChild(item);
    });

    // Highlight com animação suave nas 3 primeiras posições
    setTimeout(() => {
        document.querySelectorAll('.rank-item').forEach((item, i) => {
            item.style.animationDelay = `${i * 60}ms`;
            item.classList.add('rank-animate-in');
        });
    }, 50);
}
