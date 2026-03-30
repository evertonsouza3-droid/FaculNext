const API_BASE = '/api';
let currentExamId = null;
let currentExam = null;
let currentQuestaoIndex = 0;
let respostas = [];
let timerInterval = null;
let timerSegundos = 0;

// =============================================
// TIMER
// =============================================
function startTimer(durationMinutes) {
    timerSegundos = durationMinutes * 60;
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timerSegundos++;
        const h = Math.floor(timerSegundos / 3600);
        const m = Math.floor((timerSegundos % 3600) / 60);
        const s = timerSegundos % 60;
        const display = h > 0
            ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
            : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        
        const timerEl = document.getElementById('exam-timer');
        if (timerEl) timerEl.innerText = display;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// =============================================
// RENDER QUESTÃO
// =============================================
function renderQuestao() {
    if (!currentExam || currentQuestaoIndex >= currentExam.questoes.length) {
        finalizarSimulado();
        return;
    }

    const q = currentExam.questoes[currentQuestaoIndex];
    const total = currentExam.questoes.length;
    const pct = Math.round((currentQuestaoIndex / total) * 100);

    // Progresso
    document.getElementById('progress-label').innerText = `Questão ${currentQuestaoIndex + 1} de ${total}`;
    document.getElementById('progress-pct').innerText = `${pct}%`;
    document.getElementById('progress-fill').style.width = `${pct}%`;

    // Conteúdo da questão
    document.getElementById('q-materia').innerText = q.materia || 'Geral';
    document.getElementById('q-enunciado').innerText = q.enunciado;

    // Alternativas com seleção visual
    const altArea = document.getElementById('q-alternativas');
    altArea.innerHTML = '';
    for (const letra in q.alternativas) {
        const texto = q.alternativas[letra];
        const isSelected = respostas[currentQuestaoIndex] === letra;
        const label = document.createElement('label');
        label.className = `alt-label${isSelected ? ' selected' : ''}`;
        label.innerHTML = `
            <input type="radio" name="resposta" value="${letra}" ${isSelected ? 'checked' : ''}>
            <span class="alt-letter">${letra})</span> ${texto}
        `;
        label.addEventListener('click', () => {
            document.querySelectorAll('.alt-label').forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
        });
        altArea.appendChild(label);
    }
}

// =============================================
// INICIAR PROVA
// =============================================
async function iniciarProva(examId = 'nacional_123') {
    window._lastExamId = examId;
    currentExamId = examId;
    currentQuestaoIndex = 0;
    respostas = [];
    stopTimer();

    const modal = document.getElementById('exam-modal');
    const questaoBody = document.getElementById('exam-questao-body');
    const resultScreen = document.getElementById('result-screen');

    questaoBody.style.display = 'block';
    resultScreen.style.display = 'none';
    modal.style.display = 'flex';

    try {
        const examRes = await fetch(`${API_BASE}/exams/${examId}/questions`);
        const examData = await examRes.json();
        if (!examData.sucesso) throw new Error(examData.erro || 'Não foi possível carregar questões');

        currentExam = examData;
        respostas = Array(currentExam.questoes.length).fill(null);

        document.getElementById('exam-titulo-header').innerText = examData.titulo || 'Simulado';
        startTimer(0);
        renderQuestao();
    } catch (e) {
        modal.style.display = 'none';
        alert(`Erro ao iniciar prova: ${e.message}`);
    }
}

// =============================================
// GRAVAR E AVANÇAR
// =============================================
function gravarResposta() {
    const selected = document.querySelector('input[name="resposta"]:checked');
    if (!selected) {
        const btn = document.getElementById('btn-gravar');
        btn.innerText = 'Selecione uma alternativa!';
        btn.style.background = '#ff5252';
        setTimeout(() => {
            btn.innerText = 'Gravar e Avançar ➔';
            btn.style.background = '';
        }, 1500);
        return;
    }
    respostas[currentQuestaoIndex] = selected.value;
    currentQuestaoIndex++;
    renderQuestao();
}

// =============================================
// PULAR QUESTÃO
// =============================================
function pularQuestao() {
    if (!currentExam) return;
    // Mantém null (pulada)
    currentQuestaoIndex++;
    renderQuestao();
}

// =============================================
// FECHAR / PAUSAR PROVA
// =============================================
function fecharProva() {
    if (confirm('Tem certeza? Seu progresso nesta sessão será perdido.')) {
        stopTimer();
        document.getElementById('exam-modal').style.display = 'none';
        currentExam = null;
        respostas = [];
        currentQuestaoIndex = 0;
    }
}

// =============================================
// FINALIZAR SIMULADO
// =============================================
async function finalizarSimulado() {
    if (!currentExam) return;
    stopTimer();

    const userId = localStorage.getItem('faculnext_user_id') || 1;

    try {
        const res = await fetch(`${API_BASE}/exams/${currentExam.examId}/evaluate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, respostas })
        });
        const data = await res.json();

        if (data.sucesso) {
            renderResultScreen(data, currentExam.questoes, respostas);
        } else {
            throw new Error(data.erro || 'Falha na avaliação');
        }
    } catch (e) {
        alert(`Erro ao finalizar simulado: ${e.message}`);
        document.getElementById('exam-modal').style.display = 'none';
    }
}

// =============================================
// TELA DE RESULTADO PREMIUM
// =============================================
function renderResultScreen(data, questoes, respostasAluno) {
    const questaoBody = document.getElementById('exam-questao-body');
    const resultScreen = document.getElementById('result-screen');

    questaoBody.style.display = 'none';
    resultScreen.style.display = 'block';
    resultScreen.scrollIntoView({ behavior: 'smooth' });

    // Animar nota
    const notaEl = document.getElementById('result-nota');
    let count = 0;
    const target = data.nota_tri;
    const step = Math.ceil(target / 40);
    const counter = setInterval(() => {
        count = Math.min(count + step, target);
        notaEl.innerText = count;
        if (count >= target) clearInterval(counter);
    }, 30);

    document.getElementById('result-acertos').innerText = data.acertos_corridos;
    document.getElementById('result-erros').innerText = data.total_questoes - data.acertos_corridos;
    document.getElementById('result-total').innerText = data.total_questoes;
    document.getElementById('result-feedback').innerText = `"${data.feedback}"`;

    // Gabarito Visual
    const gGrid = document.getElementById('gabarito-grid');
    gGrid.innerHTML = '';

    questoes.forEach((q, idx) => {
        const respostaAluno = respostasAluno[idx];
        const correta = q.correta;
        let cls = 'pulado';
        let icon = '—';

        if (respostaAluno === null) {
            cls = 'pulado'; icon = '⏭';
        } else if (respostaAluno === correta) {
            cls = 'acerto'; icon = '✓';
        } else {
            cls = 'erro'; icon = '✗';
        }

        gGrid.insertAdjacentHTML('beforeend', `
            <div class="gabarito-item ${cls}">
                <span class="g-num">${idx + 1}</span>
                <span>${icon}</span>
                <small>${correta}</small>
            </div>
        `);
    });
}

// =============================================
// FECHAR RESULTADO
// =============================================
function fecharResultado() {
    document.getElementById('exam-modal').style.display = 'none';
    currentExam = null;
    respostas = [];
    currentQuestaoIndex = 0;
}

// =============================================
// CARREGAR DASHBOARD
// =============================================
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

// =============================================
// EXPOR E INICIALIZAR
// =============================================
window.iniciarProva = iniciarProva;
window.fecharProva = fecharProva;
window.pularQuestao = pularQuestao;
window.gravarResposta = gravarResposta;
window.fecharResultado = fecharResultado;

window.addEventListener('DOMContentLoaded', async () => {
    await carregarDashboard();

    document.querySelectorAll('.btn-secondary.btn-block[data-exam-id]').forEach(btn => {
        btn.addEventListener('click', () => iniciarProva(btn.dataset.examId));
    });
});
