const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.get("SELECT id FROM trilhas WHERE titulo LIKE 'Matemática%'", (err, t) => {
    if (t) {
        db.get("SELECT count(*) as count FROM trilha_aulas WHERE trilha_id = ?", [t.id], (err, row) => {
            console.log(`Math Lessons: ${row.count}`);
            db.get("SELECT count(*) as count FROM trilha_exercicios WHERE aula_id IN (SELECT id FROM trilha_aulas WHERE trilha_id = ?)", [t.id], (err, rowEx) => {
                console.log(`Math Exercises: ${rowEx.count}`);
                db.close();
            });
        });
    } else {
        console.log("Trilha Matemática não encontrada.");
        db.close();
    }
});
