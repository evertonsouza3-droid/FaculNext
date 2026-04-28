document.addEventListener('DOMContentLoaded', () => {
    const cepInput = document.getElementById('cep-input');
    const estadoInput = document.getElementById('estado-input');
    const cepFeedback = document.getElementById('cep-feedback');
    const submitBtn = document.getElementById('submit-btn');
    const regiaoBox = document.getElementById('regiao-box');
    const nomeRegiao = document.getElementById('nome-regiao');
    const form = document.getElementById('cadastro-form');

    let isCepValid = false;
    const cpfInput = document.getElementById('cpf-input');
    const celularInput = document.getElementById('celular-input');

    // Mascara simples de CPF
    cpfInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 3) val = val.replace(/^(\d{3})(\d)/, '$1.$2');
        if (val.length > 6) val = val.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
        if (val.length > 9) val = val.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
        e.target.value = val;
    });

    // Mascara simples de Celular
    celularInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 0) val = val.replace(/^(\d)/, '($1');
        if (val.length > 2) val = val.replace(/^\((\d{2})(\d)/, '($1) $2');
        if (val.length > 7) val = val.replace(/^\((\d{2})\)\s(\d{5})(\d)/, '($1) $2-$3');
        e.target.value = val;
    });

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
            const cep = cepInput.value;
            const estado = estadoInput.value;
            const cpf = cpfInput.value;
            const celular = celularInput.value;

            try {
                const res = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, cep, estado, cpf, celular })
                });
                
                const data = await res.json();
                
                if (data.sucesso) {
                    localStorage.setItem('faculnext_user_id', data.userId);
                    submitBtn.innerText = "Direcionando o teste";
                    
                    setTimeout(() => {
                        document.getElementById('cadastro-box').style.display = 'none';
                        document.getElementById('vocacional-box').style.display = 'flex';
                        document.getElementById('glow-bg').style.background = 'var(--neon-cyan)';
                        atualizarCard(); // Inicializar primeiro card
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

// LOGICA PROFISSIONAL RIASEC (USANDO SHARED) 🎓
let indiceAtual = 0;
const pontuacao = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

window.handleRIASEC = function(sim) {
    if (typeof questoesRIASEC === 'undefined') return;

    // 1. Contabilizar pontos
    const q = questoesRIASEC[indiceAtual];
    if (sim) pontuacao[q.tipo]++;

    // 2. Animar o card
    const card = document.getElementById('main-card');
    card.style.transform = sim ? 'translateX(400px) rotate(20deg)' : 'translateX(-400px) rotate(-20deg)';
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
    if (typeof questoesRIASEC === 'undefined') return;
    const q = questoesRIASEC[indiceAtual];
    document.getElementById('vocacional-progress').style.width = ((indiceAtual + 1) / questoesRIASEC.length * 100) + '%';
    document.getElementById('step-counter').innerText = `Etapa ${indiceAtual + 1}/12`;
    document.getElementById('card-icon').innerText = q.icone;
    document.getElementById('card-category-name').innerText = q.titulo;
    document.getElementById('card-text').innerText = q.texto;
}

function mostrarResultadoRIASEC() {
    const resultado = calcularResultadoRIASEC(pontuacao);
    const userId = localStorage.getItem('faculnext_user_id');

    // Salvar no servidor
    fetch(`/api/users/${userId}/vocational`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: resultado.nome })
    }).finally(() => {
        document.getElementById('t-actions').style.display = 'none';
        document.querySelector('.vocacional-header').style.display = 'none';
        document.getElementById('main-card').style.display = 'none';
        
        const resBox = document.getElementById('vocacional-resultado');
        resBox.style.display = 'block';
        document.getElementById('resultado-titulo').innerText = `Match: ${resultado.nome}`;
        document.getElementById('resultado-desc').innerText = resultado.desc;
    });
}
