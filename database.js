const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('main.db', (err) => {
    if (err) throw err;
    console.log("SQLite connecté → main.db");
});

// Création des tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        );
    `);

    console.log("Tables initialisées");
});

module.exports = db;
