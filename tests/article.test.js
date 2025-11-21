process.env.NODE_ENV = 'main';

let articleId;

// tests/article.test.js
const request = require('supertest');
const app = require('../app');
const sqlite3 = require('sqlite3').verbose();


    // Tests pour l'endpoint GET /articles
    describe("API Articles - GET /articles", () => {
        // Test pour vérifier que l'endpoint retourne la liste des articles avec les propriétés attendues
        test('devrait retourner la liste des articles & tester si nom, prix et stock sont présents', async () => {
            const response = await request(app).get('/articles');

            // Vérifier le statut de la réponse & que le corps de la réponse est un tableau
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            // Vérifier que chaque article a les propriétés 'id', 'nom', 'prix' et 'stock'
            const article = response.body[0];
            expect(article).toHaveProperty('id');
            expect(article).toHaveProperty('nom');
            expect(article).toHaveProperty('prix');
            expect(article).toHaveProperty('stock');

            // Vérifier le type de chaques propriétés
            expect(typeof article.nom).toBe('string');
            expect(typeof article.prix).toBe('number');
            expect(typeof article.stock).toBe('number');
        });
    });

    process.env.NODE_ENV = 'test';

    // --- DB pour POST/PUT/DELETE sur mémoire ---
    const dbTest = new sqlite3.Database(':memory:', (err) => {
        if (err) throw err;
    });

    // Créer la table articles dans la DB de test
    dbTest.serialize(() => {
        dbTest.run(`
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                prix REAL NOT NULL,
                stock INTEGER NOT NULL
            )
        `);
    });

    // ==================== TEST INSERT ====================
    test("insérer un article dans la DB test", (done) => {
        dbTest.run(
            "INSERT INTO articles (nom, prix, stock) VALUES (?, ?, ?)",
            ["Test Produit", 123.45, 10],
            function (err) {
                expect(err).toBeNull();

                articleId = this.lastID;

                expect(typeof articleId).toBe("number");

                done();
            }
        );
    });

    // ==================== TEST UPDATE ====================
    test("modifier l'article dans la DB test", (done) => {

        dbTest.run(
            "UPDATE articles SET nom=?, prix=?, stock=? WHERE id=?",
            ["Produit Modifié", 200, 5, articleId],
            (err) => {
                expect(err).toBeNull();

                // vérifier ensuite
                dbTest.get(
                    "SELECT * FROM articles WHERE id=?",
                    [articleId],
                    (err, row) => {
                        expect(err).toBeNull();

                        expect(row.nom).toBe("Produit Modifié");
                        expect(row.prix).toBe(200);
                        expect(row.stock).toBe(5);

                        done();
                    }
                );
            }
        );
    });

    // ==================== TEST DELETE ====================
    test("supprimer l'article de la DB test", (done) => {

        dbTest.run(
            "DELETE FROM articles WHERE id=?",
            [articleId],
            (err) => {
                expect(err).toBeNull();

                // vérifier suppression
                dbTest.get(
                    "SELECT * FROM articles WHERE id=?",
                    [articleId],
                    (err, row) => {
                        expect(err).toBeNull();
                        expect(row).toBeUndefined();
                        done();
                    }
                );
            }
        );
    });