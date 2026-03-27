window.assinarPlano = async function(planoEscolhido) {
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    
    // Pequena firula visual
    const btnClick = event.target;
    const oldText = btnClick.innerText;
    btnClick.innerText = "Processando Assinatura... ⏳";
    btnClick.disabled = true;

    try {
        const res = await fetch(`/api/checkout/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, plano: planoEscolhido })
        });
        const data = await res.json();
        
        if (data.sucesso && data.url) {
            btnClick.innerText = "Redirecionando para o Carrinho... 🛒";
            btnClick.style.background = "var(--primary-red)";
            btnClick.style.color = "#fff";
            
            setTimeout(() => {
                window.location.href = data.url;
            }, 800);
        } else {
            alert("Erro no pagamento: " + data.erro);
            btnClick.innerText = oldText;
            btnClick.disabled = false;
        }
    } catch (e) {
        console.error('Erro no Checkout:', e);
        alert("Falha de conexão com gateway de pagamento.");
        btnClick.innerText = oldText;
        btnClick.disabled = false;
    }
};

// Ao carregar a tela, destacar o plano atual se já tiver
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('faculnext_user_id') || 1;
    try {
        const res = await fetch(`/api/users/${userId}/dashboard`);
        const data = await res.json();
        if(data.sucesso) {
            document.getElementById('current-plan-badge').innerText = `Plano ${data.plano_ativo || 'Ativo'}`;
        }
    } catch (e) {}
});
