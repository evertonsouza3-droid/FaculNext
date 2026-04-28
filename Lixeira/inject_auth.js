const fs = require('fs');
const files = ['dashboard.html', 'trilhas.html', 'simulados.html', 'redacao.html', 'carreiras.html', 'ranking.html', 'planos.html'];

files.forEach(f => {
    const path = './' + f;
    if (fs.existsSync(path)) {
        let content = fs.readFileSync(path, 'utf8');
        if (!content.includes('js/auth.js')) {
            content = content.replace('</head>', '    <script src="js/auth.js"></script>\n</head>');
            fs.writeFileSync(path, content);
            console.log(`✅ Injetado em ${f}`);
        } else {
            console.log(`⚠️ Já presente em ${f}`);
        }
    }
});
