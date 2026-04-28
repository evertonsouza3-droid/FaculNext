async function run() {
    try {
        console.log(">> Testando envio de Redação");
        let res = await fetch("http://localhost:3001/api/essays/submit", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 1, texto: 'A inteligência artificial transformará as relações do futuro através de uma revolução tecnológica...', tema: 'Tecnologia' })
        });
        let data = await res.json();
        console.log("RESPOSTA CORRETOR:", data);
        console.log("\n✅ Validações do corretor completas.");
    } catch(e) { console.error(e) }
}
run();
