// tests/article.test.js
const request = require('supertest');
const app = require('../app');

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
    });
});
