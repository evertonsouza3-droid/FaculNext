// Middleware simples de Frontend para verificar autenticação
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('faculnext_token');
    
    // Se não tiver token, redireciona para a home/login
    if (!token) {
        console.warn("Usuário não autenticado. Redirecionando para login...");
        window.location.href = 'login.html';
        return;
    }

    // Opcional: Decode do JWT para fins visuais (nome, logout, etc)
    // No frontend não é seguro validar assinatura de JWT, mas serve para UX
});
