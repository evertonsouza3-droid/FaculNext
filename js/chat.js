function toggleChat() {
    const chat = document.getElementById('chat-window');
    chat.classList.toggle('chat-hidden');
    
    // Remove pulse se estiver abrindo
    if(!chat.classList.contains('chat-hidden')) {
        document.getElementById('ai-chat-widget').classList.remove('ai-chat-active');
    }
}

async function sendMessage() {
    const input = document.getElementById('user-msg-input');
    const messages = document.getElementById('chat-messages');
    const text = input.value.trim();
    
    if(!text) return;

    // Adiciona msg do usuário
    const userDiv = document.createElement('div');
    userDiv.className = 'msg user';
    userDiv.innerText = text;
    messages.appendChild(userDiv);
    input.value = '';
    
    // Auto-scroll
    messages.scrollTop = messages.scrollHeight;

    // Feedback visual de "digitando"
    const typingDiv = document.createElement('div');
    typingDiv.className = 'msg bot typing';
    typingDiv.innerText = 'Pensando...';
    messages.appendChild(typingDiv);

    try {
        const userId = localStorage.getItem('faculnext_user_id') || 1;
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, userId })
        });
        const data = await res.json();
        
        // Remove typing e adiciona resposta real
        if(typingDiv.parentNode) messages.removeChild(typingDiv);
        const botDiv = document.createElement('div');
        botDiv.className = 'msg bot';
        botDiv.innerText = data.reply;
        messages.appendChild(botDiv);
    } catch (e) {
        if(typingDiv.parentNode) messages.removeChild(typingDiv);
        
        // MOCK CHAT FALLBACK (Quando o servidor está offline ou é demo)
        const urlParams = new URLSearchParams(window.location.search);
        const mockAge = parseInt(urlParams.get('age')) || 17;
        const isJovem = mockAge <= 20;
        
        const reply = isJovem 
            ? "Pode pá! Como seu tutor, eu diria que esse conteúdo é GG se você focar na TRI. Quer um speedrun de questões?"
            : "Excelente observação. Analisando seu perfil, sugiro focar no núcleo TRI para otimizar seu tempo. Deseja auxílio?";
            
        const botDiv = document.createElement('div');
        botDiv.className = 'msg bot';
        botDiv.innerText = reply;
        messages.appendChild(botDiv);
    }
    
    messages.scrollTop = messages.scrollHeight;
    resetInactivityTimer();
}

// FUNCIONALIDADE "ATIVA": Disparo proativo
function sendProactiveMessage(text) {
    const messages = document.getElementById('chat-messages');
    const botDiv = document.createElement('div');
    botDiv.className = 'msg bot';
    botDiv.innerHTML = `🌟 <strong>Dica do Tutor:</strong> <br>${text}`;
    messages.appendChild(botDiv);
    messages.scrollTop = messages.scrollHeight;

    // Alerta Visual se o chat estiver fechado
    const chatWindow = document.getElementById('chat-window');
    const widget = document.getElementById('ai-chat-widget');
    if(chatWindow.classList.contains('chat-hidden')) {
        widget.classList.add('ai-chat-active');
    }
}

// Inatividade Crítica (30s)
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        sendProactiveMessage("Ainda por aí? Vi que sua produtividade caiu um pouco. Que tal focar em 5 questões rápidas agora?");
    }, 30000); // 30 segundos de "vácuo"
}

// Configurações Globais e Sincronização
document.addEventListener('DOMContentLoaded', () => {
    syncCashback();
    initProactiveTutor();
});

function syncCashback() {
    const balance = localStorage.getItem('faculnext_cashback') || '0.00';
    const elements = document.querySelectorAll('#cashback-value');
    elements.forEach(el => {
        el.innerText = `R$ ${parseFloat(balance).toFixed(2)}`;
    });
}

async function initProactiveTutor() {
    resetInactivityTimer();
    
    // Boas-vindas baseadas no contexto e Idade (Mockando Idade no Front se necessário)
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const urlParams = new URLSearchParams(window.location.search);
    const mockAge = parseInt(urlParams.get('age')) || 0;

    setTimeout(async () => {
        try {
            let idade = mockAge;
            if (idade === 0) {
                const res = await fetch(`/api/users/${userId}/dashboard`);
                const data = await res.json();
                idade = data.idade || 17;
            }
            const isJovem = idade <= 20;

            if(page === 'dashboard.html') {
                const msg = isJovem ? "Bora rushar essa meta de hoje? O XP tá dobrado! 🔥" : "Identifiquei que você ainda tem 2 pendências hoje. Deseja otimizar sua rotina agora?";
                sendProactiveMessage(msg);
            } else if(page === 'ranking.html') {
                const msg = isJovem ? "Tá no Top 5%! Se fizer uma redação GG agora, você vira MVP da semana! 🏆" : "Sua posição no ranking é sólida. Manter a consistência hoje garante sua liderança.";
                sendProactiveMessage(msg);
            }
        } catch(e) {}
    }, 3000); // 3 segundos para não assustar
}

// Permitir Enter no input
document.getElementById('user-msg-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});
