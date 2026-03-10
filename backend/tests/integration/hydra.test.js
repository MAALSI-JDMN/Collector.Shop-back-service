process.env.NODE_ENV = "test";

jest.mock("kafkajs", () => ({
    Kafka: jest.fn(() => ({
        producer: jest.fn(() => ({
            connect: jest.fn().mockResolvedValue(),
            send: jest.fn().mockResolvedValue(),
            disconnect: jest.fn().mockResolvedValue(),
        })),
    })),
    logLevel: { WARN: 1 },
}));

jest.mock("amqplib", () => ({
    connect: jest.fn().mockResolvedValue({
        createChannel: jest.fn().mockResolvedValue({
            assertQueue: jest.fn().mockResolvedValue(),
            sendToQueue: jest.fn().mockReturnValue(true),
            consume: jest.fn(),
            ack: jest.fn(),
        }),
        on: jest.fn(),
    }),
}));

// Mock uniquement Hydra (service externe inaccessible en test)
const mockGetOAuth2LoginRequest = jest.fn();
const mockAcceptOAuth2LoginRequest = jest.fn();
const mockGetOAuth2ConsentRequest = jest.fn();
const mockAcceptOAuth2ConsentRequest = jest.fn();
const mockAcceptOAuth2LogoutRequest = jest.fn();

jest.mock("@ory/client", () => ({
    Configuration: jest.fn(),
    OAuth2Api: jest.fn(() => ({
        getOAuth2LoginRequest: mockGetOAuth2LoginRequest,
        acceptOAuth2LoginRequest: mockAcceptOAuth2LoginRequest,
        getOAuth2ConsentRequest: mockGetOAuth2ConsentRequest,
        acceptOAuth2ConsentRequest: mockAcceptOAuth2ConsentRequest,
        acceptOAuth2LogoutRequest: mockAcceptOAuth2LogoutRequest,
    })),
}));

const request = require("supertest");
const app = require("../../app");
const db = require("../../database");

beforeEach(() => {
    jest.clearAllMocks();
});

// Nettoyage de la table users avant chaque test qui touche la DB
beforeEach((done) => {
    db.run("DELETE FROM users", done);
});

// ==================== POST /hydra/login-request ====================
describe("POST /hydra/login-request", () => {
    test("retourne 400 si challenge manquant", async () => {
        const res = await request(app)
            .post("/hydra/login-request")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Challenge manquant");
    });

    test("retourne showForm si skip est false", async () => {
        mockGetOAuth2LoginRequest.mockResolvedValue({
            data: { skip: false },
        });

        const res = await request(app)
            .post("/hydra/login-request")
            .send({ challenge: "test-challenge" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ showForm: true });
    });

    test("retourne redirectTo si skip est true", async () => {
        mockGetOAuth2LoginRequest.mockResolvedValue({
            data: { skip: true, subject: "user-123" },
        });
        mockAcceptOAuth2LoginRequest.mockResolvedValue({
            data: { redirect_to: "https://hydra/redirect" },
        });

        const res = await request(app)
            .post("/hydra/login-request")
            .send({ challenge: "test-challenge" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ redirectTo: "https://hydra/redirect" });
    });

    test("retourne 500 si Hydra echoue", async () => {
        mockGetOAuth2LoginRequest.mockRejectedValue(new Error("Hydra down"));

        const res = await request(app)
            .post("/hydra/login-request")
            .send({ challenge: "test-challenge" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Erreur lors de la communication avec Hydra");
    });
});

// ==================== POST /hydra/login-submit ====================
describe("POST /hydra/login-submit", () => {
    test("retourne 400 si email ou password manquant", async () => {
        const res = await request(app)
            .post("/hydra/login-submit")
            .send({ challenge: "c" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Email et mot de passe requis");
    });

    test("retourne 401 si utilisateur non trouve", async () => {
        const res = await request(app)
            .post("/hydra/login-submit")
            .send({ challenge: "c", email: "inconnu@test.com", password: "pass" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Email ou mot de passe incorrect");
    });

    test("retourne 401 si mot de passe incorrect", async () => {
        // D'abord creer un utilisateur via /register
        await request(app)
            .post("/hydra/register")
            .send({ email: "user@test.com", password: "bonpassword" });

        const res = await request(app)
            .post("/hydra/login-submit")
            .send({ challenge: "c", email: "user@test.com", password: "mauvaispassword" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Email ou mot de passe incorrect");
    });

    test("retourne redirectTo si login valide", async () => {
        // Creer un utilisateur
        await request(app)
            .post("/hydra/register")
            .send({ email: "user@test.com", password: "monpassword" });

        mockAcceptOAuth2LoginRequest.mockResolvedValue({
            data: { redirect_to: "https://hydra/ok" },
        });

        const res = await request(app)
            .post("/hydra/login-submit")
            .send({ challenge: "c", email: "user@test.com", password: "monpassword" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ redirectTo: "https://hydra/ok" });
    });

    test("retourne 500 si Hydra echoue apres login valide", async () => {
        await request(app)
            .post("/hydra/register")
            .send({ email: "user@test.com", password: "monpassword" });

        mockAcceptOAuth2LoginRequest.mockRejectedValue(new Error("Hydra down"));

        const res = await request(app)
            .post("/hydra/login-submit")
            .send({ challenge: "c", email: "user@test.com", password: "monpassword" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Impossible de valider le login aupres de Hydra");
    });
});

// ==================== GET /hydra/consent ====================
describe("GET /hydra/consent", () => {
    test("retourne erreur si consent_challenge manquant", async () => {
        const res = await request(app).get("/hydra/consent");

        expect(res.status).toBe(500);
    });

    test("redirige apres acceptation du consentement", async () => {
        mockGetOAuth2ConsentRequest.mockResolvedValue({
            data: {
                requested_scope: ["openid", "email"],
                requested_access_token_audience: ["my-client"],
                context: { email: "a@b.com" },
            },
        });
        mockAcceptOAuth2ConsentRequest.mockResolvedValue({
            data: { redirect_to: "https://hydra/consent-ok" },
        });

        const res = await request(app)
            .get("/hydra/consent")
            .query({ consent_challenge: "consent-123" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("https://hydra/consent-ok");
    });

    test("utilise email par defaut si context.email absent", async () => {
        mockGetOAuth2ConsentRequest.mockResolvedValue({
            data: {
                requested_scope: ["openid"],
                requested_access_token_audience: [],
                context: {},
            },
        });
        mockAcceptOAuth2ConsentRequest.mockResolvedValue({
            data: { redirect_to: "https://hydra/consent-ok" },
        });

        await request(app)
            .get("/hydra/consent")
            .query({ consent_challenge: "consent-123" });

        expect(mockAcceptOAuth2ConsentRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                acceptOAuth2ConsentRequest: expect.objectContaining({
                    session: {
                        id_token: { email: "user@example.com" },
                    },
                }),
            })
        );
    });

    test("passe l'erreur a next si Hydra echoue", async () => {
        mockGetOAuth2ConsentRequest.mockRejectedValue(new Error("Hydra down"));

        const res = await request(app)
            .get("/hydra/consent")
            .query({ consent_challenge: "consent-123" });

        expect(res.status).toBe(500);
    });
});

// ==================== GET /hydra/logout ====================
describe("GET /hydra/logout", () => {
    test("retourne erreur si logout_challenge manquant", async () => {
        const res = await request(app).get("/hydra/logout");

        expect(res.status).toBe(500);
    });

    test("redirige apres acceptation du logout", async () => {
        mockAcceptOAuth2LogoutRequest.mockResolvedValue({
            data: { redirect_to: "https://hydra/logged-out" },
        });

        const res = await request(app)
            .get("/hydra/logout")
            .query({ logout_challenge: "logout-123" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("https://hydra/logged-out");
    });

    test("passe l'erreur a next si Hydra echoue", async () => {
        mockAcceptOAuth2LogoutRequest.mockRejectedValue(new Error("Hydra down"));

        const res = await request(app)
            .get("/hydra/logout")
            .query({ logout_challenge: "logout-123" });

        expect(res.status).toBe(500);
    });
});

// ==================== POST /hydra/register ====================
describe("POST /hydra/register", () => {
    test("retourne 400 si email ou password manquant", async () => {
        const res = await request(app)
            .post("/hydra/register")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Email et mot de passe requis");
    });

    test("cree un utilisateur avec succes", async () => {
        const res = await request(app)
            .post("/hydra/register")
            .send({ email: "new@test.com", password: "pass123" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, message: "Utilisateur cree avec succes" });

        // Verifier que l'utilisateur existe bien en DB
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE email = ?", ["new@test.com"], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
        expect(user).toBeDefined();
        expect(user.email).toBe("new@test.com");
        expect(user.password_hash).toBeDefined();
    });

    test("retourne 409 si email deja utilise", async () => {
        // Creer un premier utilisateur
        await request(app)
            .post("/hydra/register")
            .send({ email: "existing@test.com", password: "pass123" });

        // Tenter de recreer avec le meme email
        const res = await request(app)
            .post("/hydra/register")
            .send({ email: "existing@test.com", password: "pass456" });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe("Cet email est deja utilise");
    });
});

// ==================== POST /hydra/callback ====================
describe("POST /hydra/callback", () => {
    test("retourne 400 si code manquant", async () => {
        const res = await request(app)
            .post("/hydra/callback")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Code d'autorisation manquant");
    });

    test("retourne tokens si echange reussi", async () => {
        const payload = { email: "a@b.com", sub: "123" };
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
        const fakeIdToken = `header.${base64Payload}.signature`;

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                access_token: "access-123",
                refresh_token: "refresh-123",
                id_token: fakeIdToken,
                expires_in: 3600,
            }),
        });

        const res = await request(app)
            .post("/hydra/callback")
            .send({ code: "auth-code-123" });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBe("access-123");
        expect(res.body.refreshToken).toBe("refresh-123");
        expect(res.body.expiresIn).toBe(3600);
        expect(res.body.user.email).toBe("a@b.com");

        delete global.fetch;
    });

    test("retourne 401 si Hydra refuse le token", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: jest.fn().mockResolvedValue({ error: "invalid_grant" }),
        });

        const res = await request(app)
            .post("/hydra/callback")
            .send({ code: "bad-code" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Echec de l'echange de token");

        delete global.fetch;
    });

    test("retourne 500 si fetch echoue", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

        const res = await request(app)
            .post("/hydra/callback")
            .send({ code: "auth-code" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Erreur interne du serveur");

        delete global.fetch;
    });

    test("retourne user vide si pas d'id_token", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                access_token: "access-123",
                refresh_token: "refresh-123",
                expires_in: 3600,
            }),
        });

        const res = await request(app)
            .post("/hydra/callback")
            .send({ code: "auth-code-123" });

        expect(res.status).toBe(200);
        expect(res.body.user).toEqual({});

        delete global.fetch;
    });
});
