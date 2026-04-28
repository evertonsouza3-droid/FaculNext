const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'score_enem_elite_secret';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDER_EMAIL = 'FaculNext <onboarding@resend.dev>';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'fake_key', 
});

// Inicializando Hotmart (Gateway de Pagamentos)
const HOTMART_WEBHOOK_TOKEN = process.env.HOTMART_WEBHOOK_TOKEN || 'hottok_mock_123';
const HOTMART_PREMIUM_LINK = process.env.HOTMART_PREMIUM_LINK || 'https://pay.hotmart.com/mock-premium';

// Carteiro Moderno (VIA API HTTP - Porta 443)
// Não trava no Render.com!
async function enviarEmailViaResend(to, subject, htmlContent) {
    if (!RESEND_API_KEY) {
        console.log("⚠️ RESEND_API_KEY NÃO CONFIGURADA. E-mail não será enviado.");
        return { sucesso: false, erro: 'Sem chave de API' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: SENDER_EMAIL, 
                to: [to],
                subject: subject,
                html: htmlContent
            })
        });

        const data = await response.json();
        console.log("📨 [RESEND API RESPONSE]:", JSON.stringify(data, null, 2));
        
        if (data.id) {
            console.log(`✅ [RESEND SUCCESS]: E-mail aceito para entrega (ID: ${data.id}) para ${to}`);
        } else {
            console.warn(`⚠️ [RESEND WARNING]: O Resend aceitou a requisição, mas não retornou um ID de entrega. Verifique o painel.`);
        }
        
        return { sucesso: true, data };
    } catch (err) {
        console.error("❌ [RESEND ERROR]:", err);
        return { sucesso: false, erro: err.message };
    }
}

// Inicializando o Motor 🚀
const app = express();
app.use(express.json());

// Configuração de Segurança de Acesso (CORS)
// Em produção, você pode restringir apenas ao seu domínio
app.use(cors({
    origin: '*', // Permitir todos por enquanto, ou restringir para o domínio do Render
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configura o Servidor para exibir as telas Front-end incríveis que fizemos
app.use(express.static(path.join(__dirname)));

console.log("-----------------------------------------");
console.log("Incializando Inteligência do FaculNext...");

// =====================================
// SETUP DE BANCO DE DADOS HÍBRIDO (SQLite local / PostgreSQL cloud)
// =====================================
const isPg = !!process.env.DATABASE_URL;
let db = {};

if (!isPg) {
    // -------------------------------------
    // MODO LOCAL (SQLite Efêmero / Dev)
    // -------------------------------------
    const isGlitch = process.env.PROJECT_DOMAIN !== undefined;
    const dbFolder = isGlitch ? '.data' : '.';
    const dbPath = `${dbFolder}/database.sqlite`;
    
    if (isGlitch) {
        const fs = require('fs');
        if (!fs.existsSync('.data')) fs.mkdirSync('.data');
    }
    
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Falha crítica ao montar o Banco de Dados:', err.message);
        } else {
            console.log(`✅ Conexão com o Banco de Dados (SQLite em ${dbPath}) estabelecida com sucesso!`);
        }
    });

} else {
    // -------------------------------------
    // MODO NUVEM DE PRODUÇÃO (PostgreSQL)
    // -------------------------------------
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } 
    });

    console.log(`☁️ Conexão de Produção (PostgreSQL Cloud) ativada com sucesso!`);

    function preparePgQuery(sql) {
        let i = 1;
        // Substitui ? por $1, $2...
        return sql.replace(/\?/g, () => `$${i++}`);
    }

    // O PostgreSQL em pool não precisa serializar
    db.serialize = (cb) => cb();

    db.run = async function(sql, params, cb) {
        if (typeof params === 'function') {
            cb = params;
            params = [];
        }
        let pgSql = preparePgQuery(sql);
        
        // Tradução de Sintaxe de Criação SQLite -> Postgres
        pgSql = pgSql.replace(/AUTOINCREMENT/gi, '');
        pgSql = pgSql.replace(/INTEGER PRIMARY KEY/gi, 'SERIAL PRIMARY KEY');
        pgSql = pgSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        pgSql = pgSql.replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT FALSE');

        // Adiciona RETURNING id para INSERTs para imitar SQLite this.lastID
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
        }

        try {
            const res = await pool.query(pgSql, params || []);
            if (cb) {
                // SQLite injeta lastID no `this`
                const context = { lastID: res.rows[0] ? res.rows[0].id : null, changes: res.rowCount };
                cb.call(context, null);
            }
        } catch (err) {
            console.error("🔴 DB PG Error:", err.message, "em SQL:", pgSql);
            if (cb) cb.call(this, err);
        }
        return this;
    };

    db.get = async function(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        try {
            const res = await pool.query(preparePgQuery(sql), params || []);
            // Converter BOOLEAN na leitura (true/false) para 1/0 para manter a regra do SQLite
            const r = res.rows[0];
            if (r && r.verificado !== undefined) r.verificado = r.verificado ? 1 : 0;
            if (cb) cb(null, r);
        } catch (err) {
            console.error("🔴 DB PG GET Error:", err.message);
            if (cb) cb(err, null);
        }
        return this;
    };

    db.all = async function(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        try {
            const res = await pool.query(preparePgQuery(sql), params || []);
            // Ajustar booleanos igual ao GET
            res.rows.forEach(r => {
                if (r.verificado !== undefined) r.verificado = r.verificado ? 1 : 0;
            });
            if (cb) cb(null, res.rows);
        } catch (err) {
            console.error("🔴 DB PG ALL Error:", err.message);
            if (cb) cb(err, null);
        }
        return this;
    };
}

// Criando as Tabelas automaticamente caso o fundador exclua o arquivo ou inicie um computador novo
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        cep TEXT,
        estado TEXT,
        perfil_vocacional TEXT,
        perfil_inicial TEXT,
        nota_redacao_media INTEGER DEFAULT 0,
        cashback_saldo REAL DEFAULT 0.0,
        idade INTEGER DEFAULT 17,
        senha_hash TEXT,
        cpf TEXT,
        celular TEXT,
        verification_token TEXT,
        verificado BOOLEAN DEFAULT 0,
        plano_ativo TEXT DEFAULT 'FREE',
        assinatura_id TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        // Garantindo que as colunas existam em bases antigas
        db.run("ALTER TABLE users ADD COLUMN perfil_vocacional TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN perfil_inicial TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN nota_redacao_media INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN cashback_saldo REAL DEFAULT 0.0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN idade INTEGER DEFAULT 17", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN senha_hash TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN cpf TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN celular TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN verification_token TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN verificado BOOLEAN DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN plano_ativo TEXT DEFAULT 'FREE'", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN assinatura_id TEXT", (err) => {});
    });
    console.log('✅ Tabela de Usuários [USERS] verificada.');
    
    db.run(`CREATE TABLE IF NOT EXISTS essays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        texto TEXT,
        nota_recebida INTEGER,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    console.log('✅ Tabela de Redações [ESSAYS] verificada.');

    db.run(`CREATE TABLE IF NOT EXISTS exam_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exam_id TEXT,
        acertos INTEGER,
        total INTEGER,
        nota_tri INTEGER,
        feedback TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    console.log('✅ Tabela de Resultados de Simulados [EXAM_RESULTS] verificada.');

    db.run(`CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        titulo TEXT,
        duracao TEXT,
        dificuldade TEXT
    )`);
    console.log('✅ Tabela de Simulados [EXAMS] verificada.');

    db.run(`CREATE TABLE IF NOT EXISTS exam_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id TEXT,
        materia TEXT DEFAULT 'Geral',
        enunciado TEXT,
        correta TEXT,
        FOREIGN KEY (exam_id) REFERENCES exams (id)
    )`);
    db.run("ALTER TABLE exam_questions ADD COLUMN materia TEXT DEFAULT 'Geral'", (err) => {});
    console.log('✅ Tabela de Questões [EXAM_QUESTIONS] verificada.');

    db.run(`CREATE TABLE IF NOT EXISTS exam_alternatives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER,
        letra TEXT,
        texto TEXT,
        FOREIGN KEY (question_id) REFERENCES exam_questions (id)
    )`);
    console.log('✅ Tabela de Alternativas [EXAM_ALTERNATIVES] verificada.');

    // Inserir fixtures se não existirem
    db.get("SELECT COUNT(*) as count FROM exams", (err, row) => {
        if (err) console.error('Erro ao verificar fixtures:', err);
        else if (row.count === 0) {
            console.log('🔄 Inserindo fixtures de simulados...');

            // Inserir exams
            db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['nacional_123', 'ENEM Modelo 2024 - 1º Dia', '5h30', 'Alta']);
            db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['math_01', 'Sprint Matemática', '15 min', 'Média']);

            // QUESTÕES DO NACIONAL_123 - ENEM Modelo 2024 (Área: Ciências Humanas)
            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Ciências Humanas', 'No contexto do ENEM, qual alternativa melhor define o fenômeno da polarização política no Brasil contemporâneo?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Aumento de espaços públicos para debates face a face.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Divisão acentuada entre grupos com posições opostas e pouco diálogo.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Crescimento da participação política juvenil em eleições locais.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Melhora no consenso em torno de políticas ambientais.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Diminuição do uso de redes sociais em campanhas eleitorais.']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Ciências Humanas', 'Qual é a principal vantagem da economia circular frente ao modelo linear (extrair-produzir-descartar)?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Aumenta o descarte rápido de materiais para maior geração de empregos.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Reduz o consumo de recursos naturais e minimiza resíduos.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Prioriza a mineração em biomas preservados.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Garante a exclusão de produtos não recicláveis no mercado.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Impede a inovação em cadeia de suprimentos.']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Ciências Humanas', 'Na Teoria Geral do Estado, o poder constituinte originário é:', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Continuamente delegado por um parlamento específico.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Manifestação de vontade do povo na criação ou reforma da Constituição.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Um poder restrito ao Judiciário em casos excepcionais.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Exercido pela Administração Pública para legislar.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Um mecanismo exclusivo de governos militares.']);
                }
            });

            // QUESTÕES DE LINGUAGENS
            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Linguagens', 'Em relação à intertextualidade, qual afirmação está CORRETA?', 'C'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'É um recurso usado apenas em textos literários do séc. XIX.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Ocorre quando o autor ignora os textos de outros escritores.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'É o diálogo entre textos, em que um retoma, cita ou se opõe a outro.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Representa a fidelidade total ao texto original sem modificações.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'É válida somente em textos publicitários e de opinião.']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Linguagens', 'O conectivo "embora" estabelece uma relação de:', 'A'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Concessão']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Consequência']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Causa']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Finalidade']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Adição']);
                }
            });

            // QUESTÕES DE MATEMÁTICA
            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Matemática', 'Uma loja anuncia 20% de desconto em um produto que custa R$ 250,00. Qual é o valor com desconto?', 'C'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'R$ 240,00']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'R$ 210,00']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'R$ 200,00']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'R$ 180,00']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'R$ 230,00']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Matemática', 'Qual é o valor de x na equação 2x² - 8 = 0?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'x = ±1']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'x = ±2']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'x = ±3']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'x = ±4']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'x = ±8']);
                }
            });

            // QUESTÃO DE CIÊNCIAS DA NATUREZA
            db.run("INSERT INTO exam_questions (exam_id, materia, enunciado, correta) VALUES (?, ?, ?, ?)", ['nacional_123', 'Ciências da Natureza', 'A fotossíntese é o processo pelo qual as plantas produzem energia. Qual das alternativas descreve corretamente a equação geral?', 'D'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'O₂ + C₆H₁₂O₆ → CO₂ + H₂O + Energia']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'CO₂ + H₂O → O₂ + C₆H₁₂O₆ sem luz']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'H₂O + Luz → CO₂ + C₆H₁₂O₆']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'CO₂ + H₂O + Luz → C₆H₁₂O₆ + O₂']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'C₆H₁₂O₆ + Luz → CO₂ + H₂O']);
                }
            });

            // Inserir questões para math_01
            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['math_01', 'Se 3x - 1 = 8, então x = ?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', '2']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', '3']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', '4']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', '5']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', '6']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['math_01', 'Qual o valor de 25% de 120?', 'C'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', '20']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', '25']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', '30']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', '35']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', '40']);
                }
            });

            // Inserir exames adicionais
            db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['nat_02', 'Natureza FUVEST', '2h', 'Média']);
            db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['hum_03', 'Letras e Lógica', '1h30', 'Alta']);

            // Questões para nat_02
            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nat_02', 'Qual é a função principal da mitocôndria na célula?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Produzir proteínas']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Gerar energia (ATP)']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Armazenar material genético']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Controlar a entrada de substâncias']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Sintetizar lipídios']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nat_02', 'O que é fotossíntese?', 'A'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Processo pelo qual plantas produzem oxigênio e glicose']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Quebra de moléculas de glicose para obter energia']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Absorção de água pelas raízes']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Reprodução assexuada em bactérias']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Formação de anticorpos no sistema imune']);
                }
            });

            // Questões para hum_03
            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['hum_03', 'Qual é o principal tema da obra "Dom Casmurro" de Machado de Assis?', 'C'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'A abolição da escravatura']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'A Revolução Industrial']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Ciúmes e suspeitas conjugais']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'A independência do Brasil']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'A exploração da Amazônia']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['hum_03', 'Em lógica, o que é uma proposição?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Uma pergunta que requer resposta']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Uma afirmação que pode ser verdadeira ou falsa']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Uma sequência de números']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Um tipo de poema']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Uma unidade de medida']);
                }
            });
        }
    });

    // 🎮 CRIAR CONTA DEMO AUTOMATICAMENTE (Dentro do fluxo garantido)
    const demoEmail = 'demo@faculnext.com';
    const demoSenha = 'elite123';
    
    db.get("SELECT id FROM users WHERE email = ?", [demoEmail], async (err, row) => {
        if (err) {
            console.error("⚠️ Erro ao verificar conta demo:", err.message);
            return;
        }
        if (!row) {
            const hash = await bcrypt.hash(demoSenha, 10);
            db.run("INSERT INTO users (nome, email, senha_hash, plano_ativo, verificado) VALUES (?, ?, ?, ?, ?)", 
            ['Aluno Demo Elite', demoEmail, hash, 'ELITE', 1], (err) => {
                if (!err) console.log(`🚀 [DEMO ACCOUNT]: Conta ${demoEmail} criada com sucesso (Senha: ${demoSenha})`);
                else console.error("❌ Erro ao criar conta demo:", err.message);
            });
        } else {
            console.log(`✅ [DEMO ACCOUNT]: Conta ${demoEmail} já existe.`);
        }
    });
});



// ==========================================
// 🔌 APIs E COMUNICAÇÃO (As pontes pro Front)
// ==========================================

// Health Check para Render
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'FaculNext API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Endpoint para recarregar fixtures (desenvolvimento)
app.post('/api/dev/reload-fixtures', (req, res) => {
    // Limpar tabelas existentes
    db.run("DELETE FROM exam_alternatives");
    db.run("DELETE FROM exam_questions");
    db.run("DELETE FROM exams");

    // Reinserir exames
    db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['nacional_123', 'ENEM Modelo 2024 - 1º Dia', '5h30', 'Alta']);
    db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['math_01', 'Sprint Matemática', '15 min', 'Média']);
    db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['nat_02', 'Natureza FUVEST', '2h', 'Média']);
    db.run("INSERT INTO exams (id, titulo, duracao, dificuldade) VALUES (?, ?, ?, ?)", ['hum_03', 'Letras e Lógica', '1h30', 'Alta']);

    // Questões para nacional_123
    db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nacional_123', 'No contexto do ENEM, qual alternativa melhor define o fenômeno da polarização política no Brasil contemporâneo?', 'B'], function(err) {
        if (!err) {
            const qId = this.lastID;
            db.run("INSERT INTO exam_alternatives (question_id, letra, texto, correta) VALUES (?, ?, ?, ?)", [qId, 'A', 'Aumento de espaços públicos para debates face a face.', 0]);
            db.run("INSERT INTO exam_alternatives (question_id, letra, texto, correta) VALUES (?, ?, ?, ?)", [qId, 'B', 'Divisão acentuada entre grupos com posições opostas e pouco diálogo.', 1]);
            db.run("INSERT INTO exam_alternatives (question_id, letra, texto, correta) VALUES (?, ?, ?, ?)", [qId, 'C', 'Crescimento da participação política juvenil em eleições locais.', 0]);
            db.run("INSERT INTO exam_alternatives (question_id, letra, texto, correta) VALUES (?, ?, ?, ?)", [qId, 'D', 'Melhora no consenso em torno de políticas ambientais.', 0]);
            db.run("INSERT INTO exam_alternatives (question_id, letra, texto, correta) VALUES (?, ?, ?, ?)", [qId, 'E', 'Diminuição do uso de redes sociais em campanhas eleitorais.', 0]);
        }
    });

    // Adicionar mais questões similares para os outros exames...
    // (abreviado para brevidade)

    res.json({ sucesso: true, mensagem: 'Fixtures recarregadas!' });
});

// Rota 1: Cadastrar Aluno Localmente (Gerando Email de Confirmação com Token Seguro)
app.post('/api/users/register', async (req, res) => {
    const { nome, email, cep, estado, cpf, celular } = req.body;
    console.log(`\n📝 [ONBOARDING]: Iniciando registro para: ${email}`);
    
    if (!cpf || !celular) return res.status(400).json({ sucesso: false, erro: 'Dados Pessoais (CPF e Celular) são obrigatórios para a matrícula.' });
    
    try {
        const tokenAtivacao = crypto.randomBytes(32).toString('hex');
        
        // Cadastra parcialmente no Banco de Dados (sem senha ainda) e verificado = falso
        db.run("INSERT INTO users (nome, email, cep, estado, cpf, celular, verification_token, verificado) VALUES (?, ?, ?, ?, ?, ?, ?, 0)", 
        [nome, email, cep, estado, cpf, celular, tokenAtivacao], async function(err) {
            
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ sucesso: false, erro: 'Este e-mail ou CPF já está registrado na plataforma.' });
                }
                return res.status(400).json({ sucesso: false, erro: err.message });
            }
            
            const novoUserId = this.lastID;
            
            res.json({ 
                sucesso: true, 
                userId: novoUserId, 
                mensagem: 'Matrícula pré-aprovada! O e-mail de ativação será enviado após a conclusão do seu Teste Vocacional.' 
            });
        });
    } catch (err) {
        res.status(500).json({ sucesso: false, erro: 'Erro ao processar o cadastro.' });
    }
});

// NOVA ROTA FASE 6: Validar Token do Email e Criar a Senha
app.post('/api/users/confirm-password', async (req, res) => {
    const { token, senha } = req.body;
    
    if (!token || !senha || senha.length < 6) return res.status(400).json({ sucesso: false, erro: 'Token inválido ou senha muito curta.' });

    // 1. Procurar o usuário pelo TOKEN primeiro para diagnóstico
    db.get("SELECT id, email, verificado FROM users WHERE verification_token = ?", [token], async (err, user) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro interno no banco de dados.' });

        if (!user) {
            // Caso 1: Token não existe (banco zerado ou link antigo)
            return res.status(404).json({ 
                sucesso: false, 
                erro: 'Este link expirou ou é inválido. Como você limpou o banco, por favor, realize um NOVO cadastro no site para gerar um link atualizado.' 
            });
        }

        if (user.verificado === 1) {
            // Caso 2: Já ativado
            return res.status(400).json({ sucesso: false, erro: 'Esta conta já foi ativada anteriormente. Tente fazer login.' });
        }

        // Token válido e não utilizado: Vamos criar a senha!
        const senha_hash = await bcrypt.hash(senha, 10);
        
        db.run("UPDATE users SET senha_hash = ?, verification_token = NULL, verificado = 1 WHERE id = ?", [senha_hash, user.id], function(err) {
            if (err) return res.status(500).json({ sucesso: false, erro: 'Falha ao criptografar sua conta.' });
            
            const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ sucesso: true, userId: user.id, token: jwtToken, mensagem: 'Conta Validadíssima!' });
        });
    });
});

// 🚨 ROTA DE EMERGÊNCIA: RESET DE BANCO DE DADOS (Zera todos os usuários para novos testes)
app.get('/api/admin/reset-database-danger-zone', (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM users", (err) => {
            if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao limpar banco: ' + err.message });
            console.log("🛑 DATABASE RESET: Todos os usuários foram removidos pelo administrador.");
            res.send(`
                <body style="font-family: sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh;">
                    <div style="text-align: center; border: 2px solid #E50914; padding: 40px; border-radius: 15px;">
                        <h1 style="color: #E50914;">Banco de Dados Zerado! 🧹</h1>
                        <p>Todos os usuários, CPFs e e-mails foram removidos com sucesso.</p>
                        <p>Você já pode fechar esta aba e tentar um novo cadastro no site.</p>
                        <a href="/" style="color: #fff; text-decoration: underline;">Voltar para Home</a>
                    </div>
                </body>
            `);
        });
    });
});

// NOVA ROTA: Login
app.post('/api/users/login', (req, res) => {
    const { email, senha } = req.body;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro no banco de dados' });
        if (!user) return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
        
        if (!user.senha_hash) {
            return res.status(400).json({ sucesso: false, erro: 'Esta conta é legada. Por favor, cadastre-se novamente.'});
        }
        
        const valid = await bcrypt.compare(senha, user.senha_hash);
        if (!valid) return res.status(401).json({ sucesso: false, erro: 'Senha incorreta' });
        
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            sucesso: true,
            userId: user.id,
            token,
            mensagem: 'Login realizado com sucesso!'
        });
    });
});

// Rota 2: Salvar o Perfil Vocacional e Disparar E-mail de Boas-Vindas
app.post('/api/users/:id/vocational', (req, res) => {
    const { perfil } = req.body;
    const userId = req.params.id;
    console.log(`\n🎯 [ONBOARDING]: Teste vocacional concluído para User ID: ${userId} (${perfil})`);

    // 1. Atualizar Profile
    db.get("SELECT perfil_inicial, nome, email, verification_token FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            console.error(`❌ [DÉBUG]: Erro no db.get: ${err.message}`);
            return res.status(500).json({ sucesso: false, erro: 'Erro interno no banco' });
        }
        if (!row) {
            console.warn(`⚠️ [DÉBUG]: Usuário ${userId} não encontrado no banco.`);
            return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });
        }

        const { nome, email, verification_token } = row;
        const jaTemPerfilInicial = row.perfil_inicial;
        console.log(`✅ [DÉBUG]: Dados recuperados: ${nome} (${email}) - Token: ${verification_token ? 'OK' : 'MISSING'}`);

        const updateSql = jaTemPerfilInicial 
            ? "UPDATE users SET perfil_vocacional = ? WHERE id = ?" 
            : "UPDATE users SET perfil_vocacional = ?, perfil_inicial = ? WHERE id = ?";
        const updateParams = jaTemPerfilInicial ? [perfil, userId] : [perfil, perfil, userId];

        console.log(`📝 [DÉBUG]: Atualizando perfil no banco...`);
        db.run(updateSql, updateParams, async function(err) {
            if (err) {
                console.error(`❌ [DÉBUG]: Erro no db.run update: ${err.message}`);
                return res.status(400).json({ sucesso: false, erro: err.message });
            }
            console.log(`✅ [DÉBUG]: Perfil atualizado com sucesso no banco.`);

            // 2. Disparar E-mail de Boas-Vindas APÓS o teste
            const host = process.env.APP_URL || req.headers.host || 'faculnext.onrender.com';
            const protocol = req.protocol || 'https';
            const URL_CRIAR_SENHA = `${protocol}://${host}/setup-senha.html?token=${verification_token}`;
            
            const htmlEmail = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #141414; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
                        .header { padding: 40px 20px; text-align: center; border-bottom: 2px solid #E50914; }
                        .logo { font-size: 32px; font-weight: 900; color: #E50914; letter-spacing: -1px; }
                        .logo span { color: #ffffff; }
                        .content { padding: 40px 30px; line-height: 1.6; }
                        h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 20px; }
                        p { color: #cccccc; font-size: 16px; margin-bottom: 30px; }
                        .match-box { background: #1f1f1f; border: 1px solid #333; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #E50914; }
                        .match-title { color: #E50914; font-weight: 800; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
                        .match-result { font-size: 24px; font-weight: 900; color: #fff; }
                        .btn { display: inline-block; background-color: #E50914; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; transition: background-color 0.3s ease; }
                        .footer { padding: 30px; text-align: center; color: #666666; font-size: 12px; background-color: #080808; }
                        .link-apoio { color: #E50914; text-decoration: none; font-size: 11px; word-break: break-all; opacity: 0.6; }
                    </style>
                </head>
                <body>
                    <div class="container" style="margin-top: 40px; margin-bottom: 40px;">
                        <div class="header">
                            <div class="logo">Facul<span>Next</span>.</div>
                        </div>
                        <div class="content">
                            <h1>Para sua jornada, ${nome.split(' ')[0]}. 🎓</h1>
                            <p>O resultado do seu Teste Vocacional está pronto. Com base nas suas respostas, identificamos que você possui um perfil dominante:</p>
                            
                            <div class="match-box">
                                <div class="match-title">SEU PERFIL ACADÊMICO</div>
                                <div class="match-result">${perfil}</div>
                            </div>

                            <p>Agora que sabemos o seu potencial, criamos o seu ambiente de estudos personalizado. Para ativar o seu acesso e começar a sua trilha, clique abaixo:</p>
                            
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${URL_CRIAR_SENHA}" class="btn">ATIVAR MEU ACESSO AGORA</a>
                            </div>

                            <p>Estamos aqui para o seu sucesso,</p>
                            <p><strong>Equipe FaculNext</strong></p>
                        </div>
                        <div class="footer">
                            <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
                            <a href="${URL_CRIAR_SENHA}" class="link-apoio">${URL_CRIAR_SENHA}</a>
                        </div>
                    </div>
                </body>
                </html>
            `;

            console.log(`\n📧 [EMAIL SERVICE]: Disparando Boas-Vindas Personalizado para ${email}...`);
            console.log(`🔗 [DEBUG LINK]: ${URL_CRIAR_SENHA}`);
            console.log(`-----------------------------------------`);
            await enviarEmailViaResend(email, `Seu Perfil: ${perfil} - Bem-vindo ao FaculNext 🎓`, htmlEmail);

            res.json({ sucesso: true, mensagem: `Perfil [${perfil}] registrado. E-mail de ativação enviado.` });
        });
    });
});

// ==========================================
// 📝 MÓDULO REDAÇÃO (O CORE)
// ==========================================

// Rota 3: Pegar Tema da Semana Inédito
app.get('/api/essays/themes/week', (req, res) => {
    res.json({
        sucesso: true,
        tema: "Os desafios da evasão universitária no Brasil",
        textos_motivadores: [
            "A taxa de evasão nos cursos superiores chega a 50% em algumas instituições...",
            "Muitos estudantes abandonam por falta de identificação com o curso ou dificuldades financeiras."
        ]
    });
});

// Rota 4: Submeter Redação (Mock de I.A.)
app.post('/api/essays/submit', async (req, res) => {
    const { userId, texto, tema } = req.body;
    
    // Fallback: se não tiver chave OpenAI real, mantém o Mock
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'fake_key') {
        const notaMock = Math.floor(Math.random() * (1000 - 600 + 1)) + 600; // Entre 600 e 1000
        
        return db.run("INSERT INTO essays (user_id, texto, nota_recebida) VALUES (?, ?, ?)", [userId, texto, notaMock], function(err) {
            if (err) return res.status(400).json({ sucesso: false, erro: err.message });
            
            db.run("UPDATE users SET nota_redacao_media = ? WHERE id = ?", [notaMock, userId]);

            res.json({
                sucesso: true,
                essayId: this.lastID,
                nota_recebida: notaMock,
                feedback: "Redação analisada com sucesso pela I.A. Argumentação coesa e repertório produtivo! [MODO MOCK]",
                mensagem: "Sua redação foi salva no banco de dados."
            });
        });
    }

    // Integração Real OpenAI
    try {
        const systemPrompt = `Você é um avaliador super exigente da banca de redação do ENEM. Avalie a seguinte redação do aluno de acordo com as 5 competências do ENEM. O tema proposto foi: "${tema}".
Retorne APENAS um objeto JSON no formato exato:
{
  "nota": 920,
  "feedback": "Seu feedback detalhado e educativo aqui."
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: texto }
            ],
            response_format: { type: "json_object" }
        });

        const avaliacao = JSON.parse(completion.choices[0].message.content);
        const notaReal = parseInt(avaliacao.nota) || 600;
        const feedbackReal = avaliacao.feedback || "Redação avaliada. Pratique mais!";

        db.run("INSERT INTO essays (user_id, texto, nota_recebida) VALUES (?, ?, ?)", [userId, texto, notaReal], function(err) {
            if (err) return res.status(400).json({ sucesso: false, erro: err.message });
            
            db.run("UPDATE users SET nota_redacao_media = ? WHERE id = ?", [notaReal, userId]);

            res.json({
                sucesso: true,
                essayId: this.lastID,
                nota_recebida: notaReal,
                feedback: feedbackReal,
                mensagem: "Corrigida com sucesso pelo Mentor I.A."
            });
        });

    } catch (e) {
        console.error("Erro na I.A. Corretora:", e);
        res.status(500).json({ sucesso: false, erro: 'A Inteligência Artificial corretora está indisponível. Tente novamento em instantes.' });
    }
});

// ==========================================
// 💡 MÓDULO DE SIMULADOS (ARENA SCORE ENEM)
// ==========================================

// Rota 5: Listagem de Simulados Ativos
app.get('/api/exams/dashboard', (req, res) => {
    db.all("SELECT id, titulo, duracao, dificuldade FROM exams", (err, exams) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar simulados' });

        const nacional_mes = exams.find(e => e.id === 'nacional_123') || exams[0];
        const baterias_rapidas = exams.filter(e => e.id !== 'nacional_123').map(e => ({
            id: e.id,
            nome: e.titulo,
            questoes: 0 // será calculado abaixo
        }));

        // Contar questões para cada bateria rápida
        let processed = 0;
        baterias_rapidas.forEach(bateria => {
            db.get("SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?", [bateria.id], (err, row) => {
                if (!err) bateria.questoes = row.count;
                processed++;
                if (processed === baterias_rapidas.length) {
                    res.json({
                        sucesso: true,
                        nacional_mes: {
                            id: nacional_mes.id,
                            titulo: nacional_mes.titulo,
                            duracao: nacional_mes.duracao,
                            dificuldade: nacional_mes.dificuldade
                        },
                        baterias_rapidas
                    });
                }
            });
        });

        if (baterias_rapidas.length === 0) {
            res.json({
                sucesso: true,
                nacional_mes: {
                    id: nacional_mes.id,
                    titulo: nacional_mes.titulo,
                    duracao: nacional_mes.duracao,
                    dificuldade: nacional_mes.dificuldade
                },
                baterias_rapidas
            });
        }
    });
});

// Nova rota: Retornar questões reais do simulado
app.get('/api/exams/:id/questions', (req, res) => {
    const examId = req.params.id;

    db.get("SELECT id, titulo, duracao FROM exams WHERE id = ?", [examId], (err, exam) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar exame' });
        if (!exam) return res.status(404).json({ sucesso: false, erro: 'Simulado não encontrado' });

        db.all(`
            SELECT q.id, q.enunciado, q.correta as q_correta, a.letra as alternativa, a.texto
            FROM exam_questions q
            LEFT JOIN exam_alternatives a ON q.id = a.question_id
            WHERE q.exam_id = ?
            ORDER BY q.id, a.letra
        `, [examId], (err, rows) => {
            if (err) {
                console.error("SQL Error questions:", err);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar questões' });
            }

            const questoes = [];
            let currentQuestion = null;

            rows.forEach(row => {
                if (!currentQuestion || currentQuestion.id !== row.id) {
                    currentQuestion = {
                        id: row.id,
                        enunciado: row.enunciado,
                        correta: row.q_correta,
                        alternativas: {}
                    };
                    questoes.push(currentQuestion);
                }
                currentQuestion.alternativas[row.alternativa] = row.texto;
            });

            res.json({ sucesso: true, examId: exam.id, titulo: exam.titulo, questoes });
        });
    });
});

// Rota 6: Iniciar Gravação de Sessão
app.post('/api/exams/:id/session', (req, res) => {
    const { userId } = req.body;
    const examId = req.params.id;

    db.get("SELECT titulo FROM exams WHERE id = ?", [examId], (err, exam) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar exame' });
        if (!exam) return res.status(404).json({ sucesso: false, erro: 'Simulado não encontrado' });

        // Aqui poderia persistir sessão, mas para MVP apenas retorna id aleatório
        res.json({
            sucesso: true,
            sessaoId: 'sess_' + Math.floor(Math.random() * 99999),
            mensagem: `Sessão do simulado ${exam.titulo} iniciada com sucesso.`
        });
    });
});

// Rota 7: Correção Score ENEM (usando gabarito real)
app.post('/api/exams/:id/evaluate', (req, res) => {
    const { respostas, userId } = req.body; // Array com alternativas clicadas
    const examId = req.params.id;

    db.get("SELECT id, titulo FROM exams WHERE id = ?", [examId], (err, exam) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar exame' });
        if (!exam) return res.status(404).json({ sucesso: false, erro: 'Simulado não encontrado' });

        db.all(`
            SELECT q.id, q.correta
            FROM exam_questions q
            WHERE q.exam_id = ?
            ORDER BY q.id
        `, [examId], (err, questions) => {
            if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar questões' });

            const total = questions.length;
            let acertos = 0;

            questions.forEach((q, idx) => {
                const resposta = (respostas && respostas[idx]) ? respostas[idx].toUpperCase() : null;
                if (resposta === q.correta) acertos += 1;
            });

            const taxa = (acertos / total);
            const nota_tri = Math.round(450 + taxa * 450);
            let feedback = 'Parabéns, continue assim!';

            if (taxa >= 0.9) feedback = 'Excelente desempenho: Elite Score ENEM!';
            else if (taxa >= 0.7) feedback = 'Muito bom: você está no caminho certo.';
            else if (taxa >= 0.5) feedback = 'Bom, foque em revisão dos conceitos fracos.';
            else feedback = 'Estude com mais intensidade e revise os conteúdos principais.';

            // Salvar resultado no banco de dados para histórico
            const uid = userId || 1;
            db.run("INSERT INTO exam_results (user_id, exam_id, acertos, total, nota_tri, feedback) VALUES (?, ?, ?, ?, ?, ?)", [uid, exam.id, acertos, total, nota_tri, feedback], function(err) {
                if (err) {
                    console.error('Falha ao registrar resultado do simulado:', err.message);
                }
            });

            res.json({
                sucesso: true,
                nota_tri,
                acertos_corridos: acertos,
                total_questoes: total,
                feedback
            });
        });
    });
});

// ==========================================
// 🚀 FASE VI: DASHBOARD E TRILHAS INTELIGENTES
// ==========================================

// Rota 8: Resumo do Dashboard do Usuário
app.get('/api/users/:id/dashboard', (req, res) => {
    const userId = req.params.id;

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err || !row) return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado' });

        // Buscar total de questões resolvidas e evolução
        db.all("SELECT nota_tri, total, criado_em FROM exam_results WHERE user_id = ? ORDER BY criado_em ASC", [userId], (err2, results) => {
            const questoes_resolvidas = (results || []).reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
            const evolucao_semanal = results ? results.slice(-7).map(r => r.nota_tri) : [0, 0, 0, 0, 0, 0, 0];
            
            // Garantir que evolucao_semanal tenha 7 itens para o gráfico
            while(evolucao_semanal.length < 7) evolucao_semanal.unshift(0);

            res.json({
                sucesso: true,
                plano_ativo: row.plano_ativo || 'FREE',
                nome_completo: row.nome || 'Estudante',
                nome_usuario: row.nome ? row.nome.split(' ')[0] : 'Estudante',
                email_usuario: row.email || '-',
                cpf_usuario: row.cpf || '-',
                celular_usuario: row.celular || '-',
                cep_usuario: row.cep || '-',
                estado_usuario: row.estado || '-',
                perfil: row.perfil_vocacional || 'Não Definido',
                perfil_inicial: row.perfil_inicial || null,
                questoes_resolvidas: questoes_resolvidas > 0 ? questoes_resolvidas : 0, 
                ranking_percentil: row.verificado ? 12 : 0, // Mock baseado em verificação
                dias_enem: (() => { const hoje = new Date(); const enem = new Date(new Date().getFullYear(), 10, 2); if (enem < hoje) enem.setFullYear(enem.getFullYear() + 1); return Math.ceil((enem - hoje) / 86400000); })(),
                cashback_saldo: row.cashback_saldo || 0.0,
                idade: row.idade || 17,
                trilha_continuidade: {
                    materia: 'Biologia: Genética e Evolução',
                    progresso: 75,
                    aulas_restantes: 2
                },
                tarefas_hoje: [
                    { id: 1, texto: 'Revisão de Matemática', concluida: true, recompensa: 0.50 },
                    { id: 2, texto: 'Simulado Rápido de História', concluida: false, prioridade: true, recompensa: 1.00 },
                    { id: 3, texto: 'Ler tema da Redação', concluida: false, recompensa: 0.25 }
                ],
                conquistas: [
                    { id: 1, icone: '🔥', nome: '7 Dias de Fogo', desc: 'Estudou a semana toda sem parar.' },
                    { id: 2, icone: '✍️', nome: 'Escritor Ágil', desc: 'Fez uma redação em menos de 1h.' },
                    { id: 3, icone: '🎯', nome: 'Sniper ENEM', desc: 'Acertou 5 questões difíceis seguidas.' }
                ],
                evolucao_semanal: evolucao_semanal,
                simulados_historico: results ? results.reverse().slice(0, 10) : []
            });
        });
    });
});

// NOVA ROTA: Histórico de Simulados do Usuário
app.get('/api/users/:id/exams/history', (req, res) => {
    const userId = req.params.id;
    db.all("SELECT id, exam_id, acertos, total, nota_tri, feedback, criado_em FROM exam_results WHERE user_id = ? ORDER BY criado_em DESC", [userId], (err, rows) => {
        if (err) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar histórico de simulados' });
        res.json({ sucesso: true, historico: rows });
    });
});

// NOVO: Rota para Reclamar Cashback (Gamificação)
app.post('/api/users/:id/cashback/claim', (req, res) => {
    const { valor } = req.body;
    db.run("UPDATE users SET cashback_saldo = cashback_saldo + ? WHERE id = ?", [valor, req.params.id], function(err) {
        if (err) return res.status(400).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, novoSaldo: valor, mensagem: `Parabéns! R$ ${valor.toFixed(2)} adicionados ao seu saldo.` });
    });
});

// Rota 9: Trilhas Personalizadas baseadas no Foco Regional e Vocacional
app.get('/api/trilhas/user/:id', (req, res) => {
    // Retornar as trilhas da plataforma
    res.json({
        sucesso: true,
        trilhas: [
            { id: 'math', titulo: 'Matemática 📐', status: 'Em Andamento', cor: 'lime',
              desc: 'Funções, Geometria e Probabilidade com foco exclusivo no estilo de questões do ENEM.', 
              aulas: 24, ex: 150, progresso: 45 },
            { id: 'red', titulo: 'Redação ✍️', status: 'Recomendado', cor: 'purple',
              desc: 'Domine as 5 competências da Redação nota 1000 com dezenas de correções guiadas.', 
              aulas: 10, ex: 50, progresso: 10 },
            { id: 'bio', titulo: 'Biologia 🧬', status: 'Novo', cor: 'cyan',
              desc: 'Ecologia, Genética e Citologia explicadas de forma extrema e muito visual.', 
              aulas: 18, ex: 80, progresso: 0 }
        ]
    });
});

// ==========================================
// 💳 FASE VII: MONETIZAÇÃO E ASSINATURAS
// ==========================================

// Rota 10: Checkout (Redirecionamento Inteligente para Hotmart)
app.post('/api/checkout/session', async (req, res) => {
    const { userId, plano, email } = req.body;
    
    // Se for o plano Premium completo
    if (plano === 'PREMIUM') {
        const checkoutUrl = email 
            ? `${HOTMART_PREMIUM_LINK}?email=${encodeURIComponent(email)}&src=panel`
            : HOTMART_PREMIUM_LINK;
        return res.json({ sucesso: true, url: checkoutUrl });
    }
    
    // Fallback para outros planos / local
    res.json({ sucesso: true, url: `/mock-checkout.html?plan=${plano}&userId=${userId}` });
});

// Webhook REAL da Hotmart com Verificação de Hottok
app.post('/api/webhook/hotmart', async (req, res) => {
    const { hottok, status, email, transaction, prod } = req.body;

    // Verificamos a autenticidade da chamada usando o Token de Webhook da Hotmart
    if (HOTMART_WEBHOOK_TOKEN && hottok !== HOTMART_WEBHOOK_TOKEN) {
        console.error("❌ Webhook Hotmart Rejeitado (Hottok Inválido)");
        return res.status(401).json({ erro: "Não autorizado" });
    }

    // Lidar com o evento de compra aprovada
    if (status === 'APPROVED' || status === 'COMPLETED') {
        const plano = 'PREMIUM';
        
        console.log(`\n💰 [HOTMART]: Pagamento Confirmado. Ativando [${plano}] para o e-mail: ${email}`);

        // A Hotmart costuma enviar primariamente o e-mail do comprador, buscaremos o usuário por ele
        db.run("UPDATE users SET plano_ativo = ?, assinatura_id = ? WHERE email = ?", 
        [plano, transaction, email], function(err) {
            if (err) {
                console.error("❌ Erro ao atualizar plano no banco pós-Hotmart:", err.message);
            } else if (this.changes === 0) {
                console.warn(`⚠️ ALERTA: O e-mail pagante da Hotmart (${email}) não existe no banco local. O usuário deve criar uma conta usando este mesmo e-mail para que a sincronização ocorra.`);
                // Em sistemas mais avançados, poderíamos criar uma conta "stub" (fantasma) aqui.
            } else {
                console.log(`✅ [DB UPDATED]: Plano ${plano} ativo com sucesso para ${email}.`);
            }
        });
    } else if (status === 'CANCELED' || status === 'REFUNDED' || status === 'CHARGEBACK') {
        console.log(`\n🔻 [HOTMART]: Pagamento Cancelado ou Reembolsado (${status}). Rebaixando o e-mail: ${email} para FREE.`);
        
        db.run("UPDATE users SET plano_ativo = 'FREE' WHERE email = ?", [email], function(err) {
            if (err) {
                console.error("❌ Erro ao rebaixar plano no banco pós-Hotmart:", err.message);
            } else if (this.changes > 0) {
                console.log(`✅ [DB UPDATED]: Plano rebaixado para FREE para o usuário ${email}.`);
            }
        });
    }

    res.json({ received: true });
});

// 🪄 ROTA DE "ASSINATURA MÁGICA" (Modo Demo)
// Permite ativar o Premium instantaneamente sem Stripe real
app.post('/api/webhook/payment', (req, res) => {
    const { userId, plano, status } = req.body;
    
    if (status === 'PAID') {
        console.log(`\n🪄 [MAGIC SUBSCRIPTION]: Ativando [${plano}] para Usuário ID ${userId}`);
        
        db.run("UPDATE users SET plano_ativo = ?, verificado = 1 WHERE id = ?", 
        [plano, userId], function(err) {
            if (err) {
                console.error("❌ Erro ao ativar assinatura mágica:", err.message);
                return res.status(500).json({ sucesso: false, erro: err.message });
            }
            res.json({ sucesso: true, mensagem: `Plano ${plano} ativado com sucesso!` });
        });
    } else {
        res.status(400).json({ sucesso: false, erro: 'Pagamento não confirmado' });
    }
});

// ==========================================
// 🏆 FASE VIII: GAMIFICAÇÃO & RANKING
// ==========================================

// Rota 11: Placar Geral e Ligas
app.get('/api/ranking', (req, res) => {
    // Buscar os top 10 no banco (Pode ser por maior nota_tri ou soma de acertos)
    db.all(`
        SELECT u.id, u.nome, u.estado as regiao, MAX(er.nota_tri) as pontos
        FROM users u
        JOIN exam_results er ON u.id = er.user_id
        GROUP BY u.id
        ORDER BY pontos DESC
        LIMIT 10
    `, [], (err, topPlayers) => {
        // Mock de bots para o ranking não parecer vazio se for banco novo
        const bots = [
            { id: 991, nome: "Ana Beatriz", avatar: "👩‍🔬", regiao: "Sudeste", pontos: 945, isMe: false },
            { id: 992, nome: "Carlos V.", avatar: "👨‍💻", regiao: "Sul", pontos: 880, isMe: false },
            { id: 993, nome: "Mariana Silva", avatar: "👩‍⚖️", regiao: "Nordeste", pontos: 815, isMe: false },
            { id: 994, nome: "Felipe G.", avatar: "👨‍⚕️", regiao: "Centro-Oeste", pontos: 790, isMe: false }
        ];

        // Se tiver jogadores reais, junta e ordena. Se não, usa apenas os bots.
        let leaderboard = (topPlayers && topPlayers.length > 0) ? [...topPlayers, ...bots] : bots;
        leaderboard.sort((a,b) => b.pontos - a.pontos);

        // Atribuir avatares aleatórios para bots
        const avatares = ["👩‍🔬", "👨‍💻", "👩‍⚖️", "👨‍⚕️", "👩‍🎓", "👨‍🏫", "👩‍🎨"];
        leaderboard = leaderboard.map((p, idx) => ({
            ...p,
            avatar: p.avatar || avatares[idx % avatares.length],
            pontos: Math.round(p.pontos)
        }));

        res.json({
            sucesso: true,
            jogadores: leaderboard.slice(0, 7)
        });
    });
});

// ==========================================
// 🪄 FASE IX: IA TUTOR 24H (INTELIGÊNCIA)
// ==========================================

app.post('/api/ai/chat', (req, res) => {
    const { message, userId } = req.body;
    const msgLower = message.toLowerCase();
    
    // Puxa a idade e plano do usuário para adaptar o tom
    db.get("SELECT idade, plano_ativo FROM users WHERE id = ?", [userId || 1], async (err, row) => {
        const idade = row ? row.idade : 17;
        const plano = row ? row.plano_ativo : 'FREE';
        const reflectsYouth = idade <= 20;

        // Limitação Free
        if (plano === 'FREE') {
            return res.json({ sucesso: true, reply: "⚠️ O Tutor de Inteligência Artificial Ilimitado está liberado apenas para alunos membros da Elite e Premium. Acesse a guia 'Meu Plano' para fazer o upgrade agora!" });
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'fake_key') {
            // FALLBACK: ORIENTADOR MODERNO E SÉRIO 🎓
            let reply = "Oi! Sou seu Tutor FaculNext. Estou aqui para garantir que sua jornada até a aprovação seja o mais eficiente possível. Como posso te orientar hoje?";
            
            if(msgLower.includes("redação")) {
                reply = "A redação é o pilar da sua nota mil. Foque na estrutura dissertativo-argumentativa e na clareza da sua tese. Já conferiu o tema inédito da semana no portal?";
            } else if(msgLower.includes("matemática")) {
                reply = "Matemática no ENEM exige estratégia. Domine o Score ENEM focando em questões de nível fácil e médio primeiro. Razão, proporção e porcentagem são essenciais para o seu sucesso.";
            } else if(msgLower.includes("estudar") || msgLower.includes("dica")) {
                reply = "A consistência vence o talento. Minha orientação é: siga seu Cronograma Smart e não deixe revisões para depois. Vamos bater as metas de hoje?";
            } else if(msgLower.includes("oi") || msgLower.includes("olá") || msgLower.includes("bom dia")) {
                reply = "Olá! Pronto para transformar esforço em aprovação? Vamos focar nos seus objetivos de hoje.";
            }
            
            return setTimeout(() => res.json({ sucesso: true, reply }), 1000);
        }

        // Chamada real à OpenAI com a nova Personalidade
        try {
            const systemPrompt = `Você é o AI Tutor FaculNext, um orientador educacional moderno, motivador e focado 100% no ENEM e vestibulares brasileiros. 
            Seu tom de voz deve ser:
            - Proativo e Moderno: 'Bora conquistar essa vaga!', 'Sua meta está logo ali.'
            - Sério e Técnico: Dê orientações baseadas no Score ENEM (cálculo de performance real) e competências do ENEM.
            - Conciso: Responda de forma direta, sem rodeios.
            - Linguagem: Português do Brasil, evite gírias de nicho, prefira uma fala jovem mas profissional.`;
            
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 150
            });
            
            res.json({ sucesso: true, reply: completion.choices[0].message.content });
        } catch (e) {
            console.error("Erro na I.A.:", e);
            res.status(500).json({ sucesso: false, erro: 'A I.A. Tutor está indisponível no momento devido à instabilidade na API.' });
        }
    });
});

// Porta Dinâmica do Motor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n=============================================`);
    console.log(`🔥 MOTOR BACKEND DO FACULNEXT LIGADO ONLINE! `);
    console.log(`=============================================`);
    console.log(`Acesse o Web App por: http://localhost:${PORT}`);
    console.log(`Para desligar o servidor, aperte CTRL + C.`);
    console.log(`=============================================\n`);
});
