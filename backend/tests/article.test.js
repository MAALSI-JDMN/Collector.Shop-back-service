// ----------- CRUD = DB test -----------
process.env.NODE_ENV = "test";

jest.mock("kafkajs", () => {
    return {
        Kafka: jest.fn(() => ({
            producer: jest.fn(() => ({
                connect: jest.fn().mockResolvedValue(),
                send: jest.fn().mockResolvedValue(),
                disconnect: jest.fn().mockResolvedValue(),
            })),
        })),
        logLevel: { WARN: 1 },
    };
});

const request = require("supertest");
const app = require("../app");
const db = require("../database");

let articleId;


// ==================== POST ====================
describe("POST /articles (DB test)", () => {
    test("Ajoute un article", async () => {

        const res = await request(app)
            .post("/articles")
            .send({
                nom: "Test Produit",
                prix: 123.45,
                stock: 10
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("article");

        articleId = res.body.article.id;
        expect(typeof articleId).toBe("number");
    });
});



// ==================== GET ====================
describe("GET /articles (DB test)", () => {
    test("Récupère tous les articles incluant celui ajouté", async () => {

        const res = await request(app).get("/articles");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        const last = res.body.find(a => a.id === articleId);

        expect(last).toBeDefined();
        expect(last.nom).toBe("Test Produit");
        expect(last.prix).toBe(123.45);
        expect(last.stock).toBe(10);
    });
});



// ==================== PATCH ====================
describe("PATCH /articles/:id (DB test)", () => {
    test("Modifie l’article", async () => {

        const res = await request(app)
            .patch(`/articles/${articleId}`)
            .send({
                nom: "Produit Modifié",
                prix: 200,
                stock: 5
            });

        expect(res.status).toBe(200);

        // Vérifier dans la DB réelle utilisée par l’API
        db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
            expect(err).toBeNull();
            expect(row.nom).toBe("Produit Modifié");
            expect(row.prix).toBe(200);
            expect(row.stock).toBe(5);
        });
    });
});



// ==================== DELETE ====================
describe("DELETE /articles/:id (DB test)", () => {
    test("Supprime l’article", async () => {

        const res = await request(app).delete(`/articles/${articleId}`);

        expect(res.status).toBe(200);

        db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
            expect(err).toBeNull();
            expect(row).toBeUndefined();
        });
    });
});
