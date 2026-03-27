#!/usr/bin/env node

/**
 * 🚀 Script de Deploy FaculNext
 * Execute: node deploy.js [plataforma]
 *
 * Plataformas suportadas:
 * - railway
 * - render
 * - vercel
 * - heroku
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const plataforma = process.argv[2] || 'railway';

console.log('🚀 Iniciando deploy do FaculNext...');
console.log(`📍 Plataforma: ${plataforma}`);

// Verificar arquivos necessários
const arquivosNecessarios = ['package.json', 'server.js', 'Procfile'];
console.log('\n📋 Verificando arquivos...');

arquivosNecessarios.forEach(arquivo => {
    if (fs.existsSync(arquivo)) {
        console.log(`✅ ${arquivo}`);
    } else {
        console.log(`❌ ${arquivo} - ARQUIVO AUSENTE!`);
        process.exit(1);
    }
});

// Verificar dependências
console.log('\n📦 Verificando dependências...');
try {
    execSync('npm list --depth=0', { stdio: 'pipe' });
    console.log('✅ Dependências OK');
} catch (error) {
    console.log('⚠️  Instalando dependências...');
    execSync('npm install', { stdio: 'inherit' });
}

// Testes básicos
console.log('\n🧪 Executando testes básicos...');
try {
    // Testar se o servidor inicia
    const testProcess = execSync('timeout 5 node server.js', { stdio: 'pipe' });
    console.log('✅ Servidor inicia corretamente');
} catch (error) {
    console.log('⚠️  Servidor pode ter problemas - verifique logs');
}

// Comandos por plataforma
const comandos = {
    railway: [
        'echo "📝 Passos manuais para Railway:"',
        'echo "1. Acesse: https://railway.app"',
        'echo "2. New Project > Deploy from GitHub"',
        'echo "3. Conecte seu repo FaculNext"',
        'echo "4. Railway detectará package.json e Procfile automaticamente"'
    ],
    render: [
        'echo "📝 Passos manuais para Render:"',
        'echo "1. Acesse: https://render.com"',
        'echo "2. New > Web Service"',
        'echo "3. Conecte GitHub repo"',
        'echo "4. Configure: Runtime=Node, Start=\\"node server.js\\""'
    ],
    vercel: [
        'echo "📝 Instalando Vercel CLI..."',
        'npm install -g vercel',
        'echo "📝 Fazendo deploy..."',
        'vercel --prod'
    ],
    heroku: [
        'echo "📝 Verificando Heroku CLI..."',
        'heroku --version || echo "❌ Heroku CLI não instalado"',
        'echo "📝 Comandos manuais:"',
        'echo "heroku create faculnext-app"',
        'echo "git push heroku main"'
    ]
};

console.log(`\n🎯 Instruções para ${plataforma}:`);
const cmds = comandos[plataforma] || comandos.railway;

cmds.forEach(cmd => {
    try {
        if (cmd.startsWith('echo')) {
            console.log(cmd.replace('echo ', ''));
        } else {
            console.log(`Executando: ${cmd}`);
            execSync(cmd, { stdio: 'inherit' });
        }
    } catch (error) {
        console.log(`⚠️  Comando falhou: ${cmd}`);
    }
});

console.log('\n🎉 Deploy preparado!');
console.log('📖 Consulte DEPLOY_GUIDE.md para instruções completas');
console.log('🔗 URLs de teste após deploy:');
console.log('   /api/exams/dashboard');
console.log('   /api/exams/nacional_123/questions');