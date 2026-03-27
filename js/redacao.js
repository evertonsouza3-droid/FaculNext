document.addEventListener('DOMContentLoaded', async () => {
    const textArea = document.querySelector('.editor-textarea');
    const wordCount = document.getElementById('word-count');
    const submitBtn = document.getElementById('submit-redacao-btn');

    // Carregar o tema da semana via API
    try {
        const themeRes = await fetch('http://localhost:3000/api/essays/themes/week');
        const themeData = await themeRes.json();
        if (themeData.sucesso) {
            document.querySelector('.tema-header h2').innerText = themeData.tema;
        }
    } catch (e) {
        console.error("Erro ao carregar tema", e);
    }

    // Contador de Linhas/Palavras Simulado para ter Gamificação no Editor
    if (textArea && wordCount) {
        textArea.addEventListener('input', () => {
            const text = textArea.value;
            // Considerando uma média de 10 a 15 palavras por linha na folha pautada do ENEM
            const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
            const estimatedLines = Math.ceil(words / 12); 
            
            // O ENEM possui limites de 8 a 30 linhas
            if (estimatedLines === 0) {
                wordCount.innerText = "0 / 30 linhas estimadas";
                wordCount.style.color = 'var(--text-muted)';
            } else if (estimatedLines < 8) {
                wordCount.innerText = `${estimatedLines} / 30 - Faltam 8 mínimas`;
                wordCount.style.color = '#ff5252';
            } else if (estimatedLines <= 30) {
                wordCount.innerText = `${estimatedLines} / 30 linhas estimadas`;
                wordCount.style.color = 'var(--neon-lime)';
            } else {
                wordCount.innerText = `LIMITE ULTRAPASSADO (${estimatedLines} lins)`;
                wordCount.style.color = '#ff5252';
            }
        });
    }

    // Ação do Botão
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (textArea.value.trim().split(/\s+/).length < 20) {
                alert("Sua dissertação está muito curta! Trabalhe mais os argumentos.");
                return;
            }
            submitBtn.innerText = "Corrigindo com Inteligência... 🪄";
            submitBtn.disabled = true;

            const userId = localStorage.getItem('faculnext_user_id') || 1;
            const temaAtual = document.querySelector('.tema-header h2').innerText;

            try {
                const res = await fetch('http://localhost:3000/api/essays/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, texto: textArea.value, tema: temaAtual })
                });

                const data = await res.json();

                if (data.sucesso) {
                    submitBtn.innerText = `Correção Pronta! Nota ${data.nota_recebida} 🎉`;
                    submitBtn.style.background = 'var(--neon-purple)';
                    submitBtn.style.color = '#fff';
                    alert(data.feedback);
                } else {
                    alert("Erro na correção.");
                    submitBtn.innerText = "Submeter ao Corretor";
                    submitBtn.disabled = false;
                }
            } catch (err) {
                console.error("Erro na API de submissão:", err);
                alert("Falha de conexão com o painel neural.");
                submitBtn.innerText = "Submeter ao Corretor";
                submitBtn.disabled = false;
            }
        });
    }
});
