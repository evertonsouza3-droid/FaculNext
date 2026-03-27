async function run() {
    try {
        console.log("Teste 1: /api/checkout/session");
        let res = await fetch("http://localhost:3001/api/checkout/session", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 3, plano: 'PREMIUM' })
        });
        let data = await res.json();
        console.log(" Sessão:", data);
        
        console.log("\nTeste 2: Simular Callback da Stripe /api/webhook/payment");
        res = await fetch("http://localhost:3001/api/webhook/payment", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 3, plano: 'PREMIUM', status: 'PAID' })
        });
        data = await res.json();
        console.log(" Webhook Resposta:", data);
        
        console.log("\nTeste 3: Validar Atualização do Plano no Dashboard (/api/users/3/dashboard)");
        res = await fetch("http://localhost:3001/api/users/3/dashboard");
        data = await res.json();
        console.log(" Plano Ativo no DB:", data.plano_ativo);
        
        console.log("\n✅ Teste Completo: Fluxo de Gateway Mockado foi concluído.");
    } catch (e) {
        console.error("Erro no teste:", e);
    }
}
run();
