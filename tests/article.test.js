process.env.NODE_ENV = 'main';
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

// ================== TEST POST /articles ==================
describe("API Articles - POST /articles", () => {

    beforeAll((done) => {
        // vider la table articles avant les tests
        db.run("DELETE FROM articles", done);
    });

    afterAll((done) => {
        db.close(done);
    });

    let articleId; // pour stocker l'id de l'article créé et l'utiliser dans PUT/DELETE

    it("doit ajouter un nouvel article", async () => {
        const newArticle = {
            nom: "Test Produit",
            prix: 123.45,
            stock: 10
        };

        const res = await request(app)
            .post("/articles")
            .send(newArticle);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.nom).toBe(newArticle.nom);
        expect(res.body.prix).toBe(newArticle.prix);
        expect(res.body.stock).toBe(newArticle.stock);

        articleId = res.body.id;

        // vérifier dans la DB directement
        db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
            expect(err).toBeNull();
            expect(row.nom).toBe(newArticle.nom);
            expect(row.prix).toBe(newArticle.prix);
            expect(row.stock).toBe(newArticle.stock);
        });
    });

    // ================== TEST PUT /articles/:id ==================
    it("doit modifier l'article créé", async () => {
        const updatedArticle = {
            nom: "Produit Modifié",
            prix: 200.00,
            stock: 5
        };

        const res = await request(app)
            .put(`/articles/${articleId}`)
            .send(updatedArticle);

        expect(res.status).toBe(200);
        expect(res.body.nom).toBe(updatedArticle.nom);
        expect(res.body.prix).toBe(updatedArticle.prix);
        expect(res.body.stock).toBe(updatedArticle.stock);

        // vérifier dans la DB
        db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
            expect(err).toBeNull();
            expect(row.nom).toBe(updatedArticle.nom);
            expect(row.prix).toBe(updatedArticle.prix);
            expect(row.stock).toBe(updatedArticle.stock);
        });
    });

    // ================== TEST DELETE /articles/:id ==================
    it("doit supprimer l'article créé", async () => {
        const res = await request(app)
            .delete(`/articles/${articleId}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message");

        // vérifier que l'article n'existe plus
        db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
            expect(err).toBeNull();
            expect(row).toBeUndefined();
        });
    });

});

