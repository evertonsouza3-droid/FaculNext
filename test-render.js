#!/usr/bin/env node

/**
 * 🧪 Script de Teste - FaculNext no Render
 * 
 * Execute: node test-render.js <URL_RENDER>
 * Exemplo: node test-render.js https://faculnext.onrender.com
 */

const http = require('http');
const https = require('https');

const baseUrl = process.argv[2] || 'http://localhost:3001';

console.log('🧪 Iniciando testes do FaculNext');
console.log(`📍 URL Base: ${baseUrl}\n`);

const tests = [
    {
        name: '✅ Dashboard - Listar Exames',
        path: '/api/exams/dashboard',
        method: 'GET'
    },
    {
        name: '✅ Questões - ENEM Modelo',
        path: '/api/exams/nacional_123/questions',
        method: 'GET'
    },
    {
        name: '✅ Questões - Sprint Matemática',
        path: '/api/exams/math_01/questions',
        method: 'GET'
    },
    {
        name: '✅ Avaliação TRI',
        path: '/api/exams/nacional_123/evaluate',
        method: 'POST',
        body: JSON.stringify({ respostas: ['B', 'B', 'B'], userId: 1 })
    },
    {
        name: '✅ Histórico do Usuário',
        path: '/api/users/1/exams/history',
        method: 'GET'
    }
];

let completed = 0;
let passed = 0;
let failed = 0;

function runTest(test) {
    return new Promise((resolve) => {
        const url = new URL(baseUrl + test.path);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: test.method,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const req = client.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.sucesso || res.statusCode === 200) {
                        console.log(`${test.name}`);
                        console.log(`   Status: ${res.statusCode}`);
                        console.log(`   Resposta: ${JSON.stringify(json).substring(0, 80)}...\n`);
                        passed++;
                    } else {
                        console.log(`${test.name.replace('✅', '❌')}`);
                        console.log(`   Status: ${res.statusCode}`);
                        console.log(`   Erro: ${json.erro || data}\n`);
                        failed++;
                    }
                } catch (e) {
                    console.log(`${test.name.replace('✅', '❌')}`);
                    console.log(`   Erro: Parse JSON falhou\n`);
                    failed++;
                }
                completed++;
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`${test.name.replace('✅', '❌')}`);
            console.log(`   Erro: ${err.message}\n`);
            failed++;
            completed++;
            resolve();
        });

        req.on('timeout', () => {
            console.log(`${test.name.replace('✅', '❌')}`);
            console.log(`   Erro: Timeout (5s)\n`);
            failed++;
            completed++;
            req.destroy();
            resolve();
        });

        if (test.body) {
            req.write(test.body);
        }

        req.end();
    });
}

async function runAllTests() {
    for (const test of tests) {
        await runTest(test);
    }

    console.log('━'.repeat(50));
    console.log(`\n📊 Resultados:\n`);
    console.log(`✅ Sucessos: ${passed}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log(`📈 Taxa de Sucesso: ${Math.round((passed / tests.length) * 100)}%\n`);

    if (failed === 0) {
        console.log('🎉 Todos os testes passaram! Sistema ready para produção.\n');
        console.log('📍 URLs principais:');
        console.log(`   Dashboard: ${baseUrl}`);
        console.log(`   Simulados: ${baseUrl}/simulados.html`);
        console.log(`   Redação: ${baseUrl}/redacao.html`);
    } else {
        console.log('⚠️  Alguns testes falharam. Verifique os logs do Render.\n');
        console.log('💡 Dicas:');
        console.log('   1. Verificar logs: render.com > seu app > Logs');
        console.log('   2. Reiniciar serviço: Manual deploy');
        console.log('   3. Verificar banco: SQLite init no server.js');
    }
}

runAllTests();