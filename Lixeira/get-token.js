const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.get("SELECT verification_token FROM users WHERE email='joaosilva@examplo.com'", (err, row) => {
    if (err) console.error(err);
    else console.log(row ? row.verification_token : 'Token não encontrado');
    db.close();
});
