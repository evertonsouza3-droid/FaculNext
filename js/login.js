document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const submitBtn = document.getElementById('submit-btn');
    const erroFeedback = document.getElementById('erro-feedback');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email-input').value;
        const senha = document.getElementById('senha-input').value;

        submitBtn.innerText = "Verificando Credenciais... 🔒";
        submitBtn.disabled = true;
        erroFeedback.style.display = 'none';

        try {
            const res = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await res.json();

            if (data.sucesso) {
                localStorage.setItem('faculnext_user_id', data.userId);
                localStorage.setItem('faculnext_token', data.token);
                
                submitBtn.innerText = "Acesso Permitido! Redirecionando... 🚀";
                submitBtn.style.color = "#000";
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                erroFeedback.innerText = data.erro || "Falha no login. Verifique suas credenciais.";
                erroFeedback.style.display = 'block';
                submitBtn.innerText = "Acessar Plataforma";
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Erro de API:', error);
            erroFeedback.innerText = "Erro ao conectar com o servidor.";
            erroFeedback.style.display = 'block';
            submitBtn.innerText = "Acessar Plataforma";
            submitBtn.disabled = false;
        }
    });
});

function togglePassword(inputId, el) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        el.innerText = '👓';
    } else {
        input.type = 'password';
        el.innerText = '👁️';
    }
}
