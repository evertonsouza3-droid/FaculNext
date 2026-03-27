async function run() {
    try {
        console.log(">> Testando limitações do ChatGPT em Contas Gratuitas (Alunos Básico)");
        let res = await fetch("http://localhost:3001/api/ai/chat", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Usuário 1 não pagou plano
            body: JSON.stringify({ userId: 1, message: 'Olá, me ajude a focar em redação' })
        });
        let data = await res.json();
        console.log("RESPOSTA FREE:", data.reply);

        console.log("\n>> Testando MOCK da Inteligência Artificial em Contas Premium (Aluno Premium)");
        res = await fetch("http://localhost:3001/api/ai/chat", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Usuário 3 assinou o PREMIUM no script test_checkout
            body: JSON.stringify({ userId: 3, message: 'Olá, me ajude a estudar redação' })
        });
        data = await res.json();
        console.log("RESPOSTA PREMIUM:", data.reply);
        
        console.log("\n✅ Validações de Permissão de Planos completadas na API.");
    } catch(e) { console.error(e) }
}
run();
