document.addEventListener('DOMContentLoaded', async () => {
    const textArea = document.querySelector('.editor-textarea');
    const wordCount = document.getElementById('word-count');
    const submitBtn = document.getElementById('submit-redacao-btn');

    // Carregar o tema da semana via API (porta relativa, não hardcoded)
    try {
        const themeRes = await fetch('/api/essays/themes/week');
        const themeData = await themeRes.json();
        if (themeData.sucesso) {
            const h2el = document.querySelector('.tema-header h2');
            if (h2el) h2el.innerText = themeData.tema;
        }
    } catch (e) {
        console.warn('Tema offline, usando padrão.', e);
    }

    // Contador de linhas com feedback visual em tempo real
    if (textArea && wordCount) {
        textArea.addEventListener('input', () => {
            const text = textArea.value;
            const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
            const estimatedLines = Math.ceil(words / 12);

            if (estimatedLines === 0) {
                wordCount.innerText = '0 / 30 linhas estimadas';
                wordCount.style.color = 'var(--text-muted)';
            } else if (estimatedLines < 8) {
                wordCount.innerText = `${estimatedLines} / 30 — Mínimo: 8 linhas`;
                wordCount.style.color = '#ff5252';
            } else if (estimatedLines <= 30) {
                wordCount.innerText = `${estimatedLines} / 30 linhas ✓`;
                wordCount.style.color = '#00c864';
            } else {
                wordCount.innerText = `LIMITE EXCEDIDO (${estimatedLines} linhas)`;
                wordCount.style.color = '#ff5252';
            }
        });
    }

    // Submit com feedback premium (sem alert())
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const words = (textArea?.value || '').trim().split(/\s+/).filter(w => w.length > 0).length;
            if (words < 20) {
                showToast('⚠️ Texto muito curto! Desenvolva mais seus argumentos.');
                return;
            }

            const originalText = submitBtn.innerText;
            submitBtn.innerText = '🪄 Corrigindo com Inteligência...';
            submitBtn.disabled = true;

            const userId = localStorage.getItem('faculnext_user_id') || 1;
            const temaAtual = document.querySelector('.tema-header h2')?.innerText || 'Tema geral';

            try {
                const res = await fetch('/api/essays/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, texto: textArea.value, tema: temaAtual })
                });
                const data = await res.json();

                if (data.sucesso) {
                    renderResultadoRedacao(data);
                    submitBtn.innerText = `✅ Nota ${data.nota_recebida} — Refazer`;
                    submitBtn.style.background = 'var(--primary-red)';
                    submitBtn.disabled = false;
                } else {
                    showToast('❌ Erro na correção. Tente novamente.');
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            } catch (err) {
                console.error('Erro na API de submissão:', err);
                showToast('❌ Falha de conexão com o servidor.');
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

function renderResultadoRedacao(data) {
    // Remove resultado anterior se existir
    const old = document.getElementById('resultado-redacao');
    if (old) old.remove();

    const nota = data.nota_recebida;
    const cor = nota >= 800 ? '#00c864' : nota >= 600 ? '#FFD700' : '#ff5252';
    const label = nota >= 900 ? '🏆 Excelente!' : nota >= 700 ? '👍 Muito Bom' : nota >= 600 ? '📈 Bom começo' : '💪 Precisa melhorar';

    const div = document.createElement('div');
    div.id = 'resultado-redacao';
    div.style.cssText = `
        margin-top: 24px;
        background: rgba(${nota >= 800 ? '0,200,100' : nota >= 600 ? '255,215,0' : '229,9,20'}, 0.08);
        border: 1px solid ${cor};
        border-radius: 16px;
        padding: 28px 32px;
        animation: fadeInUp 0.4s ease;
    `;
    div.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
            <div>
                <p style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;">Sua Nota TRI — Redação</p>
                <div style="font-size:4rem; font-weight:900; color:${cor}; line-height:1;">${nota}</div>
                <div style="font-size:1rem; color:${cor}; font-weight:700; margin-top:4px;">${label}</div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:center;">
                ${[['200+','Gramática'],['180+','Repertório'],['180+','Coerência'],['160+','Coesão']].map(([v,l]) => `
                    <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px;">
                        <strong style="display:block; font-size:1.1rem; color:#fff;">${v}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${l}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px 20px; font-style:italic; color:#ccc; line-height:1.6;">
            💬 "${data.feedback}"
        </div>
    `;

    const editorFooter = document.querySelector('.editor-footer');
    if (editorFooter) editorFooter.after(div);
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
