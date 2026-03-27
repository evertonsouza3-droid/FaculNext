#!/usr/bin/env node

const https = require('https');
const baseUrl = 'https://evertonsouza3-droid-project.onrender.com';

console.log('🔍 Testando FaculNext no Render...\n');

function testAPI(path, desc) {
    return new Promise((resolve) => {
        const url = new URL(path, baseUrl);
        const req = https.request(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`✅ ${desc}: ${res.statusCode} - ${json.service || 'API OK'}`);
                    resolve(true);
                } catch (e) {
                    console.log(`❌ ${desc}: ${res.statusCode} - HTML response`);
                    resolve(false);
                }
            });
        });
        req.on('error', (err) => {
            console.log(`❌ ${desc}: ERROR - ${err.message}`);
            resolve(false);
        });
        req.setTimeout(10000, () => {
            console.log(`⏰ ${desc}: TIMEOUT`);
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

async function runTests() {
    console.log(`🌐 URL: ${baseUrl}\n`);

    const results = await Promise.all([
        testAPI('/', 'Health Check'),
        testAPI('/api/exams/dashboard', 'Dashboard API'),
        testAPI('/api/exams/nacional_123/questions', 'Questões API')
    ]);

    const success = results.filter(r => r).length;
    console.log(`\n📊 Resultado: ${success}/3 testes passaram`);

    if (success === 3) {
        console.log('\n🎉 SUCESSO TOTAL! FaculNext está online e funcionando!');
        console.log('🚀 URLs funcionais:');
        console.log(`   • ${baseUrl}`);
        console.log(`   • ${baseUrl}/api/exams/dashboard`);
    } else {
        console.log('\n⚠️ Ainda há problemas. Verifique os logs do Render.');
    }
}

runTests();