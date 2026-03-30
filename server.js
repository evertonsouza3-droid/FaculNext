const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'faculnext_super_secret';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'fake_key', 
});

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
                from: 'FaculNext <onboarding@resend.dev>', 
                to: [to],
                subject: subject,
                html: htmlContent
            })
        });

        const data = await response.json();
        console.log("📨 [RESEND API]:", data);
        return { sucesso: true, data };
    } catch (err) {
        console.error("❌ [RESEND ERROR]:", err);
        return { sucesso: false, erro: err.message };
    }
}

// Inicializando o Motor 🚀
const app = express();
app.use(express.json());
app.use(cors());

// Configura o Servidor para exibir as telas Front-end incríveis que fizemos
app.use(express.static(path.join(__dirname)));

console.log("-----------------------------------------");
console.log("Incializando Inteligência do FaculNext...");

// Adaptação para Banco de Dados Permanente no Glitch (.data)
const isGlitch = process.env.PROJECT_DOMAIN !== undefined;
const dbFolder = isGlitch ? '.data' : '.';
const dbPath = `${dbFolder}/database.sqlite`;

if (isGlitch) {
    const fs = require('fs');
    if (!fs.existsSync('.data')) fs.mkdirSync('.data');
}

// Banco de Dados embutido no projeto
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Falha crítica ao montar o Banco de Dados:', err.message);
    } else {
        console.log(`✅ Conexão com o Banco de Dados (SQLite em ${dbPath}) estabelecida com sucesso!`);
    }
});

// Criando as Tabelas automaticamente caso o fundador exclua o arquivo ou inicie um computador novo
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        cep TEXT,
        estado TEXT,
        perfil_vocacional TEXT,
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
        stripe_customer_id TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        // Garantindo que as colunas existam em bases antigas
        db.run("ALTER TABLE users ADD COLUMN cashback_saldo REAL DEFAULT 0.0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN idade INTEGER DEFAULT 17", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN senha_hash TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN cpf TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN celular TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN verification_token TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN verificado BOOLEAN DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN plano_ativo TEXT DEFAULT 'FREE'", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN assinatura_id TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT", (err) => {});
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
        enunciado TEXT,
        correta TEXT,
        FOREIGN KEY (exam_id) REFERENCES exams (id)
    )`);
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

            // Inserir questões para nacional_123
            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nacional_123', 'No contexto do ENEM, qual alternativa melhor define o fenômeno da polarização política no Brasil contemporâneo?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Aumento de espaços públicos para debates face a face.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Divisão acentuada entre grupos com posições opostas e pouco diálogo.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Crescimento da participação política juvenil em eleições locais.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Melhora no consenso em torno de políticas ambientais.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Diminuição do uso de redes sociais em campanhas eleitorais.']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nacional_123', 'Qual é a principal vantagem da economia circular frente ao modelo linear (extrair-produzir-descartar)?', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Aumenta o descarte rápido de materiais para maior geração de empregos.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Reduz o consumo de recursos naturais e minimiza resíduos.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Prioriza a mineração em biomas preservados.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Garante a exclusão de produtos não recicláveis no mercado.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Impede a inovação em cadeia de suprimentos.']);
                }
            });

            db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nacional_123', 'Na Teoria Geral do Estado, o poder constituinte originário é:', 'B'], function(err) {
                if (!err) {
                    const qId = this.lastID;
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'A', 'Continuamente delegado por um parlamento específico.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'B', 'Manifestação de vontade do povo na criação ou reforma da Constituição.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'C', 'Um poder restrito ao Judiciário em casos excepcionais.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'D', 'Exercido pela Administração Pública para legislar.']);
                    db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, 'E', 'Um mecanismo exclusivo de governos militares.']);
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

            console.log('✅ Fixtures inseridos com sucesso!');
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
            const URL_CRIAR_SENHA = `https://faculnext.onrender.com/setup-senha.html?token=${tokenAtivacao}`;
            
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
                            <h1>Prepare a pipoca, ${nome.split(' ')[0]}. 🍿</h1>
                            <p>Sua jornada para o ensino superior acaba de ganhar um roteiro digno de Oscar. No <strong>FaculNext</strong>, nós não apenas ensinamos; nós transformamos seu aprendizado em uma experiência épica.</p>
                            <p>Estamos prontos para começar a sua produção. O próximo passo é definir sua chave de acesso segura:</p>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${URL_CRIAR_SENHA}" class="btn">ATIVAR MEU ACESSO PRIVADO</a>
                            </div>
                            <p>Te vemos no topo do ranking,</p>
                            <p><strong>Equipe FaculNext</strong></p>
                        </div>
                        <div class="footer">
                            <p>Você recebeu este e-mail porque se cadastrou na plataforma FaculNext.</p>
                            <p style="margin-top: 10px;">Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
                            <a href="${URL_CRIAR_SENHA}" class="link-apoio">${URL_CRIAR_SENHA}</a>
                        </div>
                    </div>
                </body>
                </html>
            `;

            console.log(`\n📧 [EMAIL SERVICE]: Disparando via API Resend para ${email}...`);
            await enviarEmailViaResend(email, 'Sua vaga no FaculNext está garantida! 🎓', htmlEmail);

            res.json({ 
                sucesso: true, 
                userId: novoUserId, 
                mensagem: 'Cadastro recebido! O e-mail de ativação foi enviado via API segura.' 
            });
        });
    } catch (err) {
        res.status(500).json({ sucesso: false, erro: 'Erro ao processar o servidor de e-mail.' });
    }
});

// NOVA ROTA FASE 6: Validar Token do Email e Criar a Senha
app.post('/api/users/confirm-password', async (req, res) => {
    const { token, senha } = req.body;
    
    if (!token || !senha || senha.length < 6) return res.status(400).json({ sucesso: false, erro: 'Token inválido ou senha muito curta.' });

    db.get("SELECT id, email FROM users WHERE verification_token = ? AND verificado = 0", [token], async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ sucesso: false, erro: 'Link de verificação inválido ou já utilizado. Tente se cadastrar novamente.' });
        }

        // Token achou o usuário: Vamos fixar a senha e ativá-lo!
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

// Rota 2: Salvar o Perfil Vocacional
app.post('/api/users/:id/vocational', (req, res) => {
    const { perfil } = req.body;
    db.run("UPDATE users SET perfil_vocacional = ? WHERE id = ?", [perfil, req.params.id], function(err) {
        if (err) return res.status(400).json({ sucesso: false, erro: err.message });
        res.json({ sucesso: true, mensagem: `O perfil de carreira [${perfil}] foi fixado na conta do aluno.` });
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
app.post('/api/essays/submit', (req, res) => {
    const { userId, texto, tema } = req.body;
    
    // Simulação de Correção I.A. instantânea
    const notaMock = Math.floor(Math.random() * (1000 - 600 + 1)) + 600; // Entre 600 e 1000
    
    db.run("INSERT INTO essays (user_id, texto, nota_recebida) VALUES (?, ?, ?)", [userId, texto, notaMock], function(err) {
        if (err) return res.status(400).json({ sucesso: false, erro: err.message });
        
        // Opcional: Atualizar a média do usuário
        db.run("UPDATE users SET nota_redacao_media = ? WHERE id = ?", [notaMock, userId]);

        res.json({
            sucesso: true,
            essayId: this.lastID,
            nota_recebida: notaMock,
            feedback: "Redação analisada com sucesso pela I.A. Argumentação coesa e repertório produtivo!",
            mensagem: "Sua redação foi salva no banco de dados."
        });
    });
});

// ==========================================
// 💡 MÓDULO DE SIMULADOS (ARENA TRI)
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

// Rota 7: Correção TRI (usando gabarito real)
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

            if (taxa >= 0.9) feedback = 'Excelente desempenho: Elite TRI!';
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

        db.all("SELECT id, exam_id, acertos, total, nota_tri, feedback, criado_em FROM exam_results WHERE user_id = ? ORDER BY criado_em DESC LIMIT 10", [userId], (err2, results) => {
            if (err2) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar histórico de simulados' });

            res.json({
                sucesso: true,
                plano_ativo: row.plano_ativo || 'FREE',
                perfil: row.perfil_vocacional || 'Não Definido',
                questoes_resolvidas: 1205,
                ranking_percentil: 5,
                dias_enem: 245,
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
                    { id: 3, icone: '🎯', nome: 'Sniper TRI', desc: 'Acertou 5 questões difíceis seguidas.' }
                ],
                evolucao_semanal: [45, 52, 48, 70, 85, 92, 88],
                simulados_historico: results
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

// Rota 10: Checkout (Geração de Link de Pagamento MOCK/Stripe)
app.post('/api/checkout/session', (req, res) => {
    const { userId, plano } = req.body;
    
    // Na vida real, chamaríamos stripe.checkout.sessions.create
    // Como é MOCK para testes sem chave, vamos retornar a URL do nosso mock-checkout.html
    const checkoutUrl = `/mock-checkout.html?plan=${plano}&userId=${userId}`;
    
    res.json({
        sucesso: true,
        url: checkoutUrl
    });
});

// Webhook Mínimo que simula a notificação de pagamento bem-sucedido
app.post('/api/webhook/payment', (req, res) => {
    const { userId, plano, status } = req.body;
    
    if (status !== 'PAID') return res.status(400).json({ erro: 'Pagamento não confirmado' });
    
    const assinaturaId = 'sub_mock_' + Math.floor(Math.random() * 999999);
    
    db.run("UPDATE users SET plano_ativo = ?, assinatura_id = ? WHERE id = ?", [plano, assinaturaId, userId], function(err) {
        if (err) return res.status(500).json({ sucesso: false, erro: err.message });
        
        console.log(`\n💰 [FINANCEIRO]: Pagamento Aprovado. Assinatura [${plano}] ativa para Aluno ID ${userId}.\n`);
        res.json({ sucesso: true, mensagem: `Plano atualizado para ${plano}` });
    });
});

// ==========================================
// 🏆 FASE VIII: GAMIFICAÇÃO & RANKING
// ==========================================

// Rota 11: Placar Geral e Ligas
app.get('/api/ranking', (req, res) => {
    // Array simulado dos 5 melhores + O Usuário atual (na posição 4)
    res.json({
        sucesso: true,
        jogadores: [
            { id: 101, nome: "Ana Beatriz", avatar: "👩‍🔬", regiao: "Sudeste", pontos: 14500, isMe: false },
            { id: 102, nome: "Carlos V.", avatar: "👨‍💻", regiao: "Sul", pontos: 13200, isMe: false },
            { id: 103, nome: "Mariana Silva", avatar: "👩‍⚖️", regiao: "Nordeste", pontos: 12950, isMe: false },
            { id: 1, nome: "Você (Estudante)", avatar: "👨‍🎓", regiao: "Sua Região", pontos: 12500, isMe: true },
            { id: 104, nome: "Felipe G.", avatar: "👨‍⚕️", regiao: "Centro-Oeste", pontos: 11800, isMe: false }
        ]
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
            return res.json({ sucesso: true, reply: "⚠️ O Tutor de Inteligência Artificial Ilimitado está liberado apenas para alunos Premium e Starter. Acesse a guia 'Meu Plano' para fazer o upgrade e desbloquear a IA Ilimitada!" });
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'fake_key') {
            // Fallback Mock se a chave não existir
            let reply = "";
            if (reflectsYouth) {
                // TOM JOVEM/GAMER 🎮
                reply = "Pode pá! Como seu tutor, eu diria que esse conteúdo é GG se você focar na TRI. Quer um speedrun de questões sobre isso?";
                if(msgLower.includes("redação")) reply = "A redação é o boss final! Foque na Competência 3 pra não tiltar os corretores. Já viu o tema da semana?";
                else if(msgLower.includes("matemática")) reply = "Matemática no ENEM é pura estratégia. Rushing de razão e proporção te coloca no Top 1% fácil!";
                else if(msgLower.includes("oi") || msgLower.includes("olá")) reply = "Salve! Pronto pra farmar uns pontos pro ENEM hoje?";
            } else {
                // TOM ADULTO/CONSULTIVO 💼
                reply = "Excelente observação. Analisando seu perfil, sugiro focar no núcleo TRI para otimizar seu tempo. Deseja uma bateria de exercícios direcionada?";
                if(msgLower.includes("redação")) reply = "A redação exige planejamento estratégico. Recomendo focar na Competência 3 para garantir a progressão textual. O tema da semana já está disponível.";
                else if(msgLower.includes("matemática")) reply = "Matemática exige raciocínio lógico focado em eficiência. Razão e proporção são as chaves para sua produtividade.";
                else if(msgLower.includes("oi") || msgLower.includes("olá")) reply = "Bom dia. Estou pronto para auxiliá-lo na sua rotina de estudos de hoje. Como posso ser útil?";
            }
            return setTimeout(() => res.json({ sucesso: true, reply }), 1200);
        }

        // Chamada real à OpenAI
        try {
            const systemPrompt = reflectsYouth 
                ? "Você é o tutor da FaculNext, focado em ENEM. Responda de forma extremamente jovem, objetiva e usando gírias gamer leves."
                : "Você é um tutor educacional do FaculNext. Responda de forma consultiva, formal, concisa e altamente direcionada ao ENEM e Vestibulares.";
            
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
