async function run() {
    try {
        console.log("1. Lendo js/cadastro.js hospedado no Render...");
        const jsRes = await fetch("https://faculnext.onrender.com/js/cadastro.js");
        if (!jsRes.ok) {
            console.log("❌ O Render retornou HTTP", jsRes.status, "ao buscar o arquivo JS.");
            return;
        }
        
        const jsText = await jsRes.text();
        
        if (jsText.includes("localhost:3000")) {
            console.log("❌ DIAGNÓSTICO: O arquivo no Render AINDA TEM localhost:3000!");
            console.log("Isso significa que o upload pro GitHub não substituiu o arquivo antigo.");
        } else if (jsText.includes("/api/users/register")) {
            console.log("✅ DIAGNÓSTICO: O arquivo no Render está correto usando /api/users/register.");
        } else {
            console.log("❓ Não encontrei localhost nem a api. Início do arquivo:", jsText.substring(0, 100));
        }

        console.log("\n2. Testando Rota de Cadastro Real API do Render...");
        const regRes = await fetch("https://faculnext.onrender.com/api/users/register", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: 'Teste', email: `teste_${Date.now()}@teste.com`, cep: '12345-678', estado: 'RJ', senha: '123' })
        });
        
        const regText = await regRes.text();
        console.log("HTTP Code API:", regRes.status);
        try {
            const data = JSON.parse(regText);
            console.log("Resposta da API:", data);
        } catch (e) {
            console.log("Resposta da API (Crasha o Frontend se for HTML):", regText.substring(0, 300));
        }

    } catch (e) { 
        console.error("Erro Crítico no Teste:", e); 
    }
}
run();