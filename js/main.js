document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const menuToggle = document.getElementById('mobile-menu');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if(menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('is-active');
            navLinksContainer.classList.toggle('active');
            
            // Impede scroll do body se o menu estiver aberto
            if(navLinksContainer.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        const navItems = document.querySelectorAll('.nav-links a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                menuToggle.classList.remove('is-active');
                navLinksContainer.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // 2. Reveal Elements as they scroll into view
    const featureCards = document.querySelectorAll('.feature-card, .pricing-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                revealObserver.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${(index % 3) * 0.1}s`;
        revealObserver.observe(card);
    });

    // 3. Efeitos dos Botões Início -> Cadastro (Modificado na Fase 6)
    const btnStart = document.getElementById('start-btn');
    if(btnStart) {
        btnStart.addEventListener('click', () => {
            window.location.href = 'cadastro.html';
        });
    }
});
