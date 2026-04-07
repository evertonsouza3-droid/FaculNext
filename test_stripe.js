async function testStripeWebhook() {
    console.log(">> Simulando Webhook do Stripe: checkout.session.completed...");

    const mockPayload = {
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_123',
                customer: 'cus_test_abc',
                subscription: 'sub_test_xyz',
                client_reference_id: '1',
                metadata: {
                    userId: '1',
                    plano: 'PREMIUM'
                }
            }
        }
    };

    try {
        const res = await fetch('http://localhost:3001/api/webhook/stripe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockPayload)
        });

        const data = await res.json();
        console.log("Resposta do Servidor:", data);

        console.log("\n>> Verificando banco de dados para Aluno ID 1...");
        const dbRes = await fetch('http://localhost:3001/api/users/1/dashboard');
        const dbData = await dbRes.json();
        
        if (dbData.plano_ativo === 'PREMIUM') {
            console.log("✅ SUCESSO: Plano atualizado para PREMIUM no banco!");
        } else {
            console.log("❌ FALHA: Plano continua como:", dbData.plano_ativo);
        }

    } catch (e) {
        console.error("Erro ao testar webhook:", e.message);
    }
}

testStripeWebhook();
