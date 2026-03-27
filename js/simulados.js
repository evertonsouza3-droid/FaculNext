const API_BASE = '/api';
let currentSessaoId = null;
let currentExam = null;
let currentQuestaoIndex = 0;
let respostas = [];

function renderQuestao() {
    const modal = document.getElementById('questao-modal');
    const badge = modal.querySelector('.modal-header .badge');
    const enunciado = modal.querySelector('.modal-body .enunciado');
    const alternativasArea = modal.querySelector('.modal-body .alternativas');

    if (!currentExam || currentQuestaoIndex >= currentExam.questoes.length) {
        finalizarSimulado();
        return;
    }

    const q = currentExam.questoes[currentQuestaoIndex];
    badge.innerText = `Questão ${currentQuestaoIndex + 1} de ${currentExam.questoes.length}`;
    enunciado.innerText = q.enunciado;

    alternativasArea.innerHTML = '';
    for (const letra in q.alternativas) {
        const texto = q.alternativas[letra];
        alternativasArea.insertAdjacentHTML('beforeend', `
            <label class="alt-label">
                <input type="radio" name="resposta" value="${letra}" ${respostas[currentQuestaoIndex] === letra ? 'checked' : ''}>
                <span class="alt-letter">${letra})</span> ${texto}
            </label>
        `);
    }
}

async function carregarDashboard() {
    try {
        const res = await fetch(`${API_BASE}/exams/dashboard`);
        const data = await res.json();
        if (!data.sucesso) throw new Error('API sem sucesso');

        const nacionalTitle = document.querySelector('.spotlight-content h2');
        const statsRow = document.querySelector('.spotlight-content .stats-row');
        if (nacionalTitle) nacionalTitle.innerText = data.nacional_mes.titulo;
        if (statsRow) {
            statsRow.innerHTML = `
                <span>⏱️ Duração Alvo: ${data.nacional_mes.duracao}</span>
                <span>📊 Dificuldade: ${data.nacional_mes.dificuldade}</span>
            `;
        }
    } catch (e) {
        console.error('Erro ao carregar dashboard de provas', e);
    }
}

async function iniciarProva(examId = 'nacional_123') {
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    try {
        const sessionRes = await fetch(`${API_BASE}/exams/${examId}/session`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({userId})
        });
        const sessionData = await sessionRes.json();
        if (!sessionData.sucesso) throw new Error(sessionData.erro || 'Falha ao iniciar sessão');

        currentSessaoId = sessionData.sessaoId;

        const examRes = await fetch(`${API_BASE}/exams/${examId}/questions`);
        const examData = await examRes.json();
        if (!examData.sucesso) throw new Error(examData.erro || 'Não foi possível carregar questões');

        currentExam = examData;
        currentQuestaoIndex = 0;
        respostas = Array(currentExam.questoes.length).fill(null);

        document.getElementById('questao-modal').style.display = 'flex';
        renderQuestao();
    } catch (e) {
        alert(`Erro ao iniciar prova: ${e.message}`);
        console.error(e);
    }
}

function fecharProva() {
    if (confirm('Tem certeza que deseja pausar o simulado agora? Seu progresso será congelado.')) {
        document.getElementById('questao-modal').style.display = 'none';
        currentSessaoId = null;
        currentExam = null;
        respostas = [];
        currentQuestaoIndex = 0;
    }
}

function pularQuestao() {
    if (!currentExam) return;
    currentQuestaoIndex += 1;
    if (currentQuestaoIndex >= currentExam.questoes.length) {
        finalizarSimulado();
    } else {
        renderQuestao();
    }
}

async function gravarRespostaEFinalizar() {
    if (!currentSessaoId || !currentExam) return;

    const selected = document.querySelector('input[name="resposta"]:checked');
    if (!selected) {
        alert('Selecione uma alternativa antes de gravar.');
        return;
    }

    respostas[currentQuestaoIndex] = selected.value;
    currentQuestaoIndex += 1;

    if (currentQuestaoIndex >= currentExam.questoes.length) {
        finalizarSimulado();
    } else {
        renderQuestao();
    }
}

async function finalizarSimulado() {
    if (!currentExam) return;

    const userId = localStorage.getItem('faculnext_user_id') || 1;
    try {
        const res = await fetch(`${API_BASE}/exams/${currentExam.examId}/evaluate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({userId, respostas})
        });
        const data = await res.json();

        if (data.sucesso) {
            document.getElementById('questao-modal').style.display = 'none';
            alert(`Simulado concluído!\n🎯 Nota TRI: ${data.nota_tri}\n🧠 Acertos: ${data.acertos_corridos}/${data.total_questoes}\n📌 Feedback: ${data.feedback}`);
        } else {
            throw new Error(data.erro || 'Falha na avaliação');
        }
    } catch (e) {
        alert(`Erro ao finalizar simulado: ${e.message}`);
    } finally {
        currentSessaoId = null;
        currentExam = null;
        respostas = [];
        currentQuestaoIndex = 0;
    }
}

window.iniciarProva = iniciarProva;
window.fecharProva = fecharProva;
window.pularQuestao = pularQuestao;
window.gravarRespostaEFinalizar = gravarRespostaEFinalizar;

// Hooks de UI
window.addEventListener('DOMContentLoaded', async () => {
    await carregarDashboard();

    document.querySelectorAll('.btn-secondary.btn-block[data-exam-id]').forEach(btn => {
        btn.addEventListener('click', () => iniciarProva(btn.dataset.examId));
    });
});
