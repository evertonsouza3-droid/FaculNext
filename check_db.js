const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.get("SELECT count(*) as count FROM trilhas", (err, row) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Trilhas count: ${row.count}`);
    db.close();
});
