const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.NODE_ENV === "test" ? ":memory:" : "main.db";

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) throw err;
    console.log(`SQLite connecté → ${DB_PATH}`);
});


// Création des tables
db.serialize(() => {

    // === Création de la table articles ===
    db.run(`
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prix REAL NOT NULL,
            stock INTEGER NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log("Tables initialisées");

    db.get("SELECT COUNT(*) AS count FROM articles", (err, row) => {
        if (err) throw err;

        if (row.count === 0) {
            // === Insertion des 6 articles ===
            const sql = `
                INSERT INTO articles (nom, prix, stock) VALUES
                ('Montre Rolex Submariner', 5000.99, 2),
                ('Figurine Funko Pop! (édition limitée) de Dumbo (Golden Age) numéro 50', 45.50, 5),
                ('Bande Dessinée Tintin au Congo (édition originale de 1931)', 249.99, 15),
                ('Pièce de 50 cents "Walking Liberty" (année 1941)', 89.00, 30),
                ('Carte Pokémon Dracaufeu (Holo, 1re édition, set de base)', 199.00, 4),
                ('Un Malle Cabine Louis Vuitton (fin du XIXe siècle)', 59.90, 50);
            `;

            db.run(sql, (err) => {
                if (err) throw err;
                console.log("6 articles ajoutés car la table était vide");
            });
        } else {
            console.log("Table 'articles' déjà remplie, aucun ajout effectué");
        }
    });
});

module.exports = db;
