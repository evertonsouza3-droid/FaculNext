const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const novasQuestoes = [
    {
        enunciado: "O efeito estufa é um fenômeno natural essencial para a manutenção da vida na Terra. No entanto, sua exacerbação causa o aquecimento global. Qual é o principal gás responsável por esse aumento antrópico?",
        correta: "C",
        alternativas: {
            "A": "Oxigênio (O2)",
            "B": "Nitrogênio (N2)",
            "C": "Dióxido de carbono (CO2)",
            "D": "Ozônio (O3)",
            "E": "CFCs"
        }
    },
    {
        enunciado: "Na história do Brasil Império, a Guerra do Paraguai (1864-1870) teve profundos impactos sociopolíticos. Uma de suas consequências para o Império Brasileiro foi:",
        correta: "B",
        alternativas: {
            "A": "O fim imediato da escravidão por decreto.",
            "B": "O fortalecimento do Exército que passou a exigir maior participação política.",
            "C": "O isolamento internacional do Brasil em relação aos EUA.",
            "D": "O crescimento econômico e superávit financeiro acelerado na década de 1870.",
            "E": "A cisão do território que deu origem ao estado do Uruguai."
        }
    },
    {
        enunciado: "Em uma Progressão Aritmética (PA), o primeiro termo é 5 e a razão é 3. Qual será o 10º termo desta sequência?",
        correta: "D",
        alternativas: {
            "A": "28",
            "B": "30",
            "C": "31",
            "D": "32",
            "E": "35"
        }
    },
    {
        enunciado: "Do ponto de vista físico, quando uma ambulância se aproxima de um observador com a sirene ligada, o som percebido por ele torna-se mais agudo. A que fenômeno ondulatório se deve essa observação?",
        correta: "E",
        alternativas: {
            "A": "Difração",
            "B": "Refração",
            "C": "Interferência construtiva",
            "D": "Ressonância",
            "E": "Efeito Doppler"
        }
    },
    {
        enunciado: "Machado de Assis marcou a literatura brasileira com a transição do Romantismo para o Realismo. Qual traço estilístico é considerado a marca de sua fase realista?",
        correta: "B",
        alternativas: {
            "A": "A idealização da mulher brasileira.",
            "B": "A análise psicológica e a ironia fina.",
            "C": "A defesa apaixonada da independência literária.",
            "D": "O indianismo heroico.",
            "E": "O foco extremo na exuberância da natureza."
        }
    }
];

db.serialize(() => {    
    console.log("Iniciando injeção de questões no banco de dados...");
    
    novasQuestoes.forEach((q) => {
        db.run("INSERT INTO exam_questions (exam_id, enunciado, correta) VALUES (?, ?, ?)", ['nacional_123', q.enunciado, q.correta], function(err) {
            if (err) {
                console.error(err);
                return;
            }
            const qId = this.lastID;
            for(const letra in q.alternativas) {
                db.run("INSERT INTO exam_alternatives (question_id, letra, texto) VALUES (?, ?, ?)", [qId, letra, q.alternativas[letra]]);
            }
            console.log(`Questão [${qId}] inserida com sucesso.`);
        });
    });
    
    setTimeout(() => {
        console.log("Processo finalizado!");
        process.exit(0);
    }, 1000);
});
