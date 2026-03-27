// carreiras.js - Lógica do Teste Vocacional Tinder
let currentQuestion = 0;
const testQuestions = [
    { text: "Você se vê liderando grandes equipes de tecnologia?", category: "Tech", img: "💻" },
    { text: "Lidar com a complexidade do corpo humano te fascina?", category: "Saúde", img: "🩺" },
    { text: "Argumentar e defender causas é o seu ponto forte?", category: "Humanas", img: "⚖️" },
    { text: "Criar soluções visuais e artísticas te motiva?", category: "Artes", img: "🎨" }
];

function startTinderTest() {
    const card = document.querySelector('.vocacional-card');
    renderQuestion(card);
}

function renderQuestion(container) {
    if (currentQuestion >= testQuestions.length) {
        showFinalMatch(container);
        return;
    }

    const q = testQuestions[currentQuestion];
    container.innerHTML = `
        <div class="vocacional-info" style="text-align: center; width: 100%;">
            <span class="badge">Questão ${currentQuestion + 1}/${testQuestions.length}</span>
            <div style="font-size: 5rem; margin: 2rem 0;">${q.img}</div>
            <h2 style="margin-bottom: 2rem;">${q.text}</h2>
            <div style="display: flex; gap: 2rem; justify-content: center;">
                <button class="btn-secondary" style="border-radius: 50%; width: 80px; height: 80px; font-size: 2rem;" onclick="nextQuestion(false)">❌</button>
                <button class="btn-primary" style="border-radius: 50%; width: 80px; height: 80px; font-size: 2rem;" onclick="nextQuestion(true)">💚</button>
            </div>
        </div>
    `;
}

function nextQuestion(liked) {
    if (liked) {
        if (typeof showToast === 'function') {
            showToast("IA: Interessante! Isso diz muito sobre você.");
        }
    }
    currentQuestion++;
    startTinderTest();
}

function showFinalMatch(container) {
    container.innerHTML = `
        <div class="vocacional-info" style="text-align: center; width: 100%;">
            <span class="badge badge-red">MATCH PERFEITO! 🔥</span>
            <div style="font-size: 5rem; margin: 2rem 0;">🚀</div>
            <h2>Sua Carreira Ideal: Ciência de Dados & IA</h2>
            <p>Seu perfil combina lógica avançada com visão estratégica. Você tem 94% de afinidade com este curso.</p>
            <button class="btn-primary mt-2" onclick="location.reload()">Refazer Teste</button>
        </div>
    `;
}

// Sobrescreve o onclick do botão no HTML que era apenas um alert
document.addEventListener('DOMContentLoaded', () => {
    const testBtn = document.querySelector('.vocacional-card button');
    if (testBtn) {
        testBtn.onclick = startTinderTest;
    }
});
