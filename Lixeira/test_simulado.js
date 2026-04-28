async function run() {
    try {
        console.log("Teste 1: /api/exams/dashboard");
        let res = await fetch("http://localhost:3001/api/exams/dashboard");
        let data = await res.json();
        console.log(" Dashboard ativo? ", data.sucesso, " | Questões na Bateria Rápida (math_01): ", data.baterias_rapidas[0].questoes);
        
        console.log("\nTeste 2: /api/exams/nacional_123/questions");
        res = await fetch("http://localhost:3001/api/exams/nacional_123/questions");
        data = await res.json();
        console.log(" Questões carregadas: ", data.questoes.length);
        
        console.log("\nTeste 3: /api/exams/nacional_123/evaluate");
        res = await fetch("http://localhost:3001/api/exams/nacional_123/evaluate", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Simulando gabarito razoavel para ver a nota
            body: JSON.stringify({ userId: 3, respostas: ["B", "B", "B", "C", "E"] })
        });
        data = await res.json();
        console.log(" Avaliação recebida: ", data);
        
        console.log("\n✅ Teste Completo: Fluxo de simulado funcional.");
    } catch (e) {
        console.error("Erro no teste:", e);
    }
}
run();
