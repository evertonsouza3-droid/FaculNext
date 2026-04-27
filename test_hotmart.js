async function run() {
    try {
        console.log("Teste 1: Simular Webhook da Hotmart (APPROVED) em /api/webhook/hotmart");
        let res = await fetch("http://localhost:3001/api/webhook/hotmart", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hottok: 'hottok_mock_123',
                status: 'APPROVED',
                email: 'aluno_teste@faculnext.com',
                transaction: 'HP000000001',
                prod: '12345'
            })
        });
        let data = await res.json();
        console.log(" Webhook Resposta:", data);
        
        console.log("\n✅ Teste Completo: Webhook da Hotmart simulado.");
    } catch (e) {
        console.error("Erro no teste:", e);
    }
}
run();
