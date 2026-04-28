async function runTest() {
    try {
        console.log("Teste 1: Registrando usuário...");
        const regRes = await fetch("http://localhost:3001/api/users/register", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: "Testador Zero", email: "testador@faculnext.com", cep: "00000000", estado: "SP", senha: "senha_forte_123" })
        });
        const regData = await regRes.json();
        console.log("Registrar Status:", regRes.status, regData);

        if(!regData.sucesso && regData.erro !== 'SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email') { 
            console.error("Falha no registro"); 
            // Retrying login if it already exists
        }

        console.log("\nTeste 2: Fazendo login com as mesmas credenciais...");
        const logRes = await fetch("http://localhost:3001/api/users/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "testador@faculnext.com", senha: "senha_forte_123" })
        });
        const logData = await logRes.json();
        console.log("Login Status:", logRes.status, logData);
        
        if (logData.token) {
            console.log("\n✅ Teste Completo: Autenticação JWT funcionando perfeitamente.");
        } else {
            console.error("\n❌ Falha: Token não recebido.");
        }
    } catch(e) {
        console.error("Erro no fetch:", e.message);
    }
}
runTest();
