document.addEventListener('DOMContentLoaded', () => {
    const cepInput = document.getElementById('cep-input');
    const estadoInput = document.getElementById('estado-input');
    const cepFeedback = document.getElementById('cep-feedback');
    const submitBtn = document.getElementById('submit-btn');
    const regiaoBox = document.getElementById('regiao-box');
    const nomeRegiao = document.getElementById('nome-regiao');
    const form = document.getElementById('cadastro-form');

    let isCepValid = false;

    // Mascara simples de CEP
    cepInput.addEventListener('input', (e) => {
        let regexCep = e.target.value.replace(/\D/g, "");
        if (regexCep.length > 5) {
            regexCep = regexCep.replace(/^(\d{5})(\d)/, "$1-$2");
        }
        e.target.value = regexCep;

        if (regexCep.length === 9) {
            buscarCep(regexCep.replace("-", ""));
        } else {
            estadoInput.value = "";
            cepFeedback.innerText = "Buscando inteligência local...";
            cepFeedback.style.color = "var(--text-muted)";
            cepInput.style.borderColor = "var(--border-glass)";
            regiaoBox.style.display = 'none';
            submitBtn.disabled = true;
            isCepValid = false;
        }
    });

    // Simulador de busca de CEP e match de Região
    function buscarCep(cep) {
        cepFeedback.innerText = "Sincronizando via satélite... 🛰️";
        
        const mapEstadosToRegiao = {
            'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
            'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
            'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
            'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
            'Sul': ['PR', 'RS', 'SC']
        };

        // Fetch API Real do ViaCEP (Permitido pois é API pública)
        fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(res => res.json())
            .then(data => {
                if(data.erro) {
                    throw new Error("CEP Inválido");
                }
                estadoInput.value = `${data.localidade} - ${data.uf}`;
                cepInput.style.borderColor = "var(--neon-lime)";
                cepFeedback.innerText = `Localizado! ✓`;
                cepFeedback.style.color = "var(--neon-lime)";
                
                // Mapear UF pra regiao
                let userRegiao = "Brasil";
                for (const reg in mapEstadosToRegiao) {
                    if(mapEstadosToRegiao[reg].includes(data.uf)) userRegiao = reg;
                }

                nomeRegiao.innerText = `Região ${userRegiao}`;
                regiaoBox.style.display = 'block';
                isCepValid = true;
                submitBtn.disabled = false;
            })
            .catch(err => {
                cepFeedback.innerText = "Endereço não encontrado na base.";
                cepFeedback.style.color = "#ff5252";
                cepInput.style.borderColor = "#ff5252";
            });
    }

    // Submit Action com transição pro Teste Vocacional
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(isCepValid && form.checkValidity()) {
            submitBtn.innerText = "Processando Cadastro... 🚀";
            submitBtn.style.color = "#000";
            submitBtn.disabled = true;

            const nome = document.getElementById('nome-input').value;
            const email = document.getElementById('email-input').value;
            const senha = document.getElementById('senha-input').value;
            const cep = cepInput.value;
            const estado = estadoInput.value;

            try {
                const res = await fetch('http://api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, cep, estado, senha })
                });
                
                const data = await res.json();
                
                if (data.sucesso) {
                    localStorage.setItem('faculnext_user_id', data.userId);
                    if (data.token) {
                        localStorage.setItem('faculnext_token', data.token);
                    }
                    submitBtn.innerText = "Quase pronto... Transição Rápida 🚀";
                    
                    setTimeout(() => {
                        document.getElementById('cadastro-box').style.display = 'none';
                        document.getElementById('vocacional-box').style.display = 'flex';
                        document.getElementById('glow-bg').style.background = 'var(--neon-cyan)';
                    }, 800);
                } else {
                    alert('Erro no cadastro: ' + data.erro);
                    submitBtn.innerText = "Tentar Novamente";
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Erro de API:', error);
                alert('Erro de comunicação com o servidor.');
                submitBtn.disabled = false;
            }
        }
    });
});

// Lógica Global do Tinder Vocacional Simulado
let currentCard = 1;
const totalCards = 3;

window.handleSwipe = function(isLiked) {
    const card = document.getElementById(`t-card-${currentCard}`);
    
    // Animação CSS de saída 
    if (isLiked) {
        card.style.transform = 'matrix(1, 0.2, -0.2, 1, 400, -100)'; // Rotação pra fora e cima-direita
        card.style.opacity = '0';
    } else {
        card.style.transform = 'matrix(1, -0.2, 0.2, 1, -400, -100)'; // Rotação pra fora e esquerda
        card.style.opacity = '0';
    }

    // Espera The Fade Animations
    setTimeout(() => {
        card.style.display = 'none';
        currentCard++;

        if (currentCard <= totalCards) {
            const nextCard = document.getElementById(`t-card-${currentCard}`);
            nextCard.style.display = 'block';
        } else {
            // Acabou o Quizz!
            const userId = localStorage.getItem('faculnext_user_id');
            const perfilDetectado = "Tecnológico de Exatas"; // Mock para MVP
            
            fetch(`http://api/users/${userId}/vocational`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perfil: perfilDetectado })
            }).then(res => res.json()).then(data => {
                document.getElementById('t-actions').style.display = 'none';
                document.querySelector('.vocacional-header').style.display = 'none';
                document.getElementById('vocacional-resultado').style.display = 'block';
            }).catch(err => {
                console.error("Erro ao salvar perfil vocacional", err);
                document.getElementById('t-actions').style.display = 'none';
                document.querySelector('.vocacional-header').style.display = 'none';
                document.getElementById('vocacional-resultado').style.display = 'block';
            });
        }
    }, 300); // 300ms de smooth transition
}
