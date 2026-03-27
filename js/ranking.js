document.addEventListener('DOMContentLoaded', () => {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    // Simulação de Dados do Ranking
    const students = [
        { name: "Ana Beatriz", points: 985, avatar: "👩‍🔬", region: "SP", isMe: false },
        { name: "Carlos Eduardo", points: 942, avatar: "👨‍💻", region: "RJ", isMe: false },
        { name: "Estudante (Você)", points: 890, avatar: "👨‍🎓", region: "MG", isMe: true },
        { name: "Mariana Silva", points: 875, avatar: "👩‍⚕️", region: "PR", isMe: false },
        { name: "João Pedro", points: 820, avatar: "👨‍⚖️", region: "BA", isMe: false },
        { name: "Fernanda Costa", points: 795, avatar: "👩‍🏫", region: "RS", isMe: false },
        { name: "Lucas Rocha", points: 750, avatar: "👨‍🎨", region: "PE", isMe: false }
    ];

    rankingList.innerHTML = '';
    
    students.forEach((student, index) => {
        const item = document.createElement('li');
        item.className = `rank-item ${student.isMe ? 'is-me' : ''}`;
        
        const position = index + 1;
        let posClass = '';
        if (position === 1) posClass = 'top1';
        else if (position === 2) posClass = 'top2';
        else if (position === 3) posClass = 'top3';

        item.innerHTML = `
            <div class="r-position ${posClass}">${position}º</div>
            <div class="r-user">
                <div class="r-avatar">${student.avatar}</div>
                <span>${student.name}</span>
                <span class="r-region">${student.region}</span>
            </div>
            <div class="r-points">${student.points} pts</div>
        `;
        rankingList.appendChild(item);
    });
});
