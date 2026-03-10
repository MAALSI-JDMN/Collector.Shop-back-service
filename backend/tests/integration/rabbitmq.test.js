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

const mockSendToQueue = jest.fn().mockReturnValue(true);

jest.mock("amqplib", () => ({
    connect: jest.fn().mockResolvedValue({
        createChannel: jest.fn().mockResolvedValue({
            assertQueue: jest.fn().mockResolvedValue(),
            sendToQueue: mockSendToQueue,
            consume: jest.fn(),
            ack: jest.fn(),
        }),
        on: jest.fn(),
    }),
}));

const request = require("supertest");
const app = require("../../app");

beforeEach(() => {
    jest.clearAllMocks();
});

// ==================== POST /rabbitmq/publish ====================
describe("POST /rabbitmq/publish", () => {
    test("publie un message avec succes", async () => {
        const res = await request(app)
            .post("/rabbitmq/publish")
            .send({ message: "Hello RabbitMQ", eventType: "TEST" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe("Message published in RabbitMQ");
    });

    test("publie avec valeurs par defaut si body vide", async () => {
        const res = await request(app)
            .post("/rabbitmq/publish")
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("retourne 500 si la publication echoue", async () => {
        mockSendToQueue.mockImplementationOnce(() => {
            throw new Error("RabbitMQ down");
        });

        const res = await request(app)
            .post("/rabbitmq/publish")
            .send({ message: "test" });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Publication failed");
    });
});

// ==================== GET /rabbitmq/ping ====================
describe("GET /rabbitmq/ping", () => {
    test("retourne succes si RabbitMQ repond", async () => {
        const res = await request(app).get("/rabbitmq/ping");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe("RabbitMQ connection successful");
    });

    test("retourne 500 si RabbitMQ ne repond pas", async () => {
        mockSendToQueue.mockImplementationOnce(() => {
            throw new Error("RabbitMQ down");
        });

        const res = await request(app).get("/rabbitmq/ping");

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

// ==================== POST /rabbitmq/notify ====================
describe("POST /rabbitmq/notify", () => {
    test("retourne ok et emet via socket.io si io est defini", async () => {
        const mockEmit = jest.fn();
        app.set("io", { emit: mockEmit });

        const data = {
            contenu: "Message RabbitMQ",
            date: "12:00:00",
            source: "rabbitmq-worker",
            origin: "Docker Worker",
            sentAt: "11:59:00",
        };

        const res = await request(app)
            .post("/rabbitmq/notify")
            .send(data);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(mockEmit).toHaveBeenCalledWith("rabbitmq-log", expect.objectContaining({
            contenu: "Message RabbitMQ",
            source: "rabbitmq-worker",
        }));

        app.set("io", undefined);
    });

    test("retourne ok meme sans io", async () => {
        app.set("io", undefined);

        const res = await request(app)
            .post("/rabbitmq/notify")
            .send({ contenu: "test" });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    test("serialise le body si contenu absent", async () => {
        const mockEmit = jest.fn();
        app.set("io", { emit: mockEmit });

        const res = await request(app)
            .post("/rabbitmq/notify")
            .send({ data: "raw" });

        expect(res.status).toBe(200);
        expect(mockEmit).toHaveBeenCalledWith("rabbitmq-log", expect.objectContaining({
            contenu: expect.stringContaining("raw"),
        }));

        app.set("io", undefined);
    });
});
