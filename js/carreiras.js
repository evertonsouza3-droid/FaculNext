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

    // 2. Animar o card
    const card = document.getElementById('main-card');
    card.style.transform = sim ? 'translateX(200px) rotate(15deg)' : 'translateX(-200px) rotate(-15deg)';
    card.style.opacity = '0';

    setTimeout(() => {
        indiceAtual++;

        if (indiceAtual < questoesRIASEC.length) {
            // Próxima Pergunta
            atualizarCard();
            card.style.transform = 'translateX(0) rotate(0)';
            card.style.opacity = '1';
        } else {
            // Final do Teste: Calcular Resultado
            mostrarResultadoRIASEC();
        }
    }, 300);
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
    const userId = localStorage.getItem('faculnext_user_id') || 1;

    // Salvar no servidor (Opcional se já estiver logado)
    fetch(`/api/users/${userId}/vocational`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: resultado.nome })
    }).finally(() => {
        document.getElementById('vocacional-tinder').style.display = 'none';
        
        const resBox = document.getElementById('vocacional-resultado');
        resBox.style.display = 'block';
        document.getElementById('result-title').innerText = `Match: ${resultado.nome}`;
        document.getElementById('result-desc').innerText = resultado.desc;
        
        if (typeof showToast === 'function') {
            showToast("Perfil Vocacional atualizado com sucesso! 🎯");
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
