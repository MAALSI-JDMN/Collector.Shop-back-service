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

// ==================== GET /demo ====================
describe("GET /demo", () => {
    test("retourne la page demo (200)", async () => {
        const res = await request(app).get("/demo");

        expect(res.status).toBe(200);
        expect(res.text).toContain("html");
    });
});

// ==================== POST /demo/valider ====================
describe("POST /demo/valider", () => {
    test("retourne les donnees soumises", async () => {
        const res = await request(app)
            .post("/demo/valider")
            .send({ nom: "Dupont", email: "d@test.com", age: "30" });

        expect(res.status).toBe(200);
        expect(res.text).toContain("Dupont");
        expect(res.text).toContain("d@test.com");
        expect(res.text).toContain("30");
    });
});
