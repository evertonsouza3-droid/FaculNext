// carreiras.js - Lógica do Teste Vocacional RIASEC Tinder
let indiceAtual = 0;
const pontuacao = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

function startTinderTest() {
    document.getElementById('vocacional-intro').style.display = 'none';
    document.getElementById('vocacional-tinder').style.display = 'flex';
    atualizarCard();
}

window.handleRIASEC = function(sim) {
    if (typeof questoesRIASEC === 'undefined') {
        console.error("Lógica RIASEC não carregada.");
        return;
    }

    // 1. Contabilizar pontos
    const q = questoesRIASEC[indiceAtual];
    if (sim) pontuacao[q.tipo]++;

    // 2. Animar o card com efeito de "mola"
    const card = document.getElementById('main-card');
    card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s';
    card.style.transform = sim ? 'translateX(300px) rotate(20deg) scale(0.8)' : 'translateX(-300px) rotate(-20deg) scale(0.8)';
    card.style.opacity = '0';

    setTimeout(() => {
        indiceAtual++;

        if (indiceAtual < questoesRIASEC.length) {
            // Próxima Pergunta
            atualizarCard();
            card.style.transition = 'none'; // Reseta instantaneamente
            card.style.transform = 'translateY(20px) scale(0.9)';
            card.style.opacity = '0';
            
            // Força reflow e anima a entrada da próxima
            void card.offsetWidth;
            card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s';
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
        } else {
            // Final do Teste: Calcular Resultado
            mostrarResultadoRIASEC();
        }
    }, 400);
};

function atualizarCard() {
    const q = questoesRIASEC[indiceAtual];
    document.getElementById('vocacional-progress').style.width = ((indiceAtual + 1) / questoesRIASEC.length * 100) + '%';
    document.getElementById('step-counter').innerText = `Etapa ${indiceAtual + 1}/12`;
    document.getElementById('card-icon').innerText = q.icone;
    document.getElementById('card-category-name').innerText = q.titulo;
    document.getElementById('card-text').innerText = q.texto;
}

function mostrarResultadoRIASEC() {
    const resultado = calcularResultadoRIASEC(pontuacao);
    const userId = localStorage.getItem('score_enem_user_id') || 1;

    // Salvar no servidor (Opcional se já estiver logado)
    fetch(`/api/users/${userId}/vocational`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: resultado.nome })
    }).finally(() => {
        document.getElementById('vocacional-tinder').style.display = 'none';
        
        const resBox = document.getElementById('vocacional-resultado');
        resBox.style.display = 'block';
        
        const titleEl = document.getElementById('result-title');
        titleEl.innerHTML = `DNA Score ENEM: <span class="match-highlight">${resultado.nome}</span>`;
        
        const descEl = document.getElementById('result-desc');
        const fullDesc = resultado.desc;
        descEl.innerText = '';
        
        let i = 0;
        function typeResult() {
            if (i < fullDesc.length) {
                descEl.innerText += fullDesc.charAt(i);
                i++;
                setTimeout(typeResult, 15);
            }
        }
        
        setTimeout(typeResult, 600);
        
        if (typeof showToast === 'function') {
            showToast("Seu DNA de Carreira foi mapeado! 🎯");
        }
    });
}

// Verificar se o usuário já tem perfil ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('faculnext_user_id');
    if (userId) {
        try {
            const res = await fetch(`/api/users/${userId}/dashboard`);
            const data = await res.json();
            if (data.sucesso && data.perfil && data.perfil !== 'Não Definido') {
                // Já tem perfil, mostrar o resultado ou opção de refazer
                // Para não quebrar a UX de exploração, vamos apenas mudar o texto do botão de intro
                const introButton = document.querySelector('#vocacional-intro .btn-primary');
                if (introButton) {
                    introButton.innerText = "Refazer Teste Vocacional 🔄";
                }
                
                const pIntro = document.querySelector('#vocacional-intro p');
                if (pIntro) {
                    pIntro.innerHTML = `Seu perfil atual é <strong>${data.perfil}</strong>. Deseja mapear seu DNA novamente?`;
                }
            }
        } catch (e) {
            console.error("Erro ao buscar perfil do usuário:", e);
        }
    }
});
