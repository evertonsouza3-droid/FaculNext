const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const subjects = [
    'Matemática', 'Redação', 'Biologia', 'História', 
    'Geografia', 'Física', 'Química', 'Português'
];

let checked = 0;

console.log("=== VERIFICANDO DADOS DO CURRÍCULO ===");

subjects.forEach(subject => {
    db.get("SELECT id FROM trilhas WHERE titulo LIKE ?", [`${subject}%`], (err, t) => {
        if (t) {
            db.get("SELECT count(*) as count FROM trilha_aulas WHERE trilha_id = ?", [t.id], (err, row) => {
                db.get("SELECT count(*) as count FROM trilha_exercicios WHERE aula_id IN (SELECT id FROM trilha_aulas WHERE trilha_id = ?)", [t.id], (err, rowEx) => {
                    console.log(`✅ ${subject}: ${row.count} Aulas | ${rowEx.count} Exercícios`);
                    finalize();
                });
            });
        } else {
            console.log(`❌ ${subject}: Trilha não encontrada.`);
            finalize();
        }
    });
});

function finalize() {
    checked++;
    if (checked === subjects.length) {
        console.log("======================================");
        db.close();
    }
}
