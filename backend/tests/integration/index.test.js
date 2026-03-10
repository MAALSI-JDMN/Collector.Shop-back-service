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

const request = require("supertest");
const app = require("../../app");

// ==================== GET / ====================
describe("GET /", () => {
    test("retourne la page d'accueil (200)", async () => {
        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Express");
    });
});

// ==================== 404 ====================
describe("Route inexistante", () => {
    test("retourne 404 pour une route inconnue", async () => {
        const res = await request(app).get("/route-qui-nexiste-pas");

        expect(res.status).toBe(404);
    });
});
