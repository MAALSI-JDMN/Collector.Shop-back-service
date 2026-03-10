process.env.NODE_ENV = "test";

const mockProducerSend = jest.fn().mockResolvedValue();
const mockProducerConnect = jest.fn().mockResolvedValue();
const mockProducerDisconnect = jest.fn().mockResolvedValue();
const mockConsumerConnect = jest.fn().mockResolvedValue();
const mockConsumerSubscribe = jest.fn().mockResolvedValue();
const mockConsumerRun = jest.fn().mockResolvedValue();
const mockConsumerDisconnect = jest.fn().mockResolvedValue();

jest.mock("kafkajs", () => ({
    Kafka: jest.fn(() => ({
        producer: jest.fn(() => ({
            connect: mockProducerConnect,
            send: mockProducerSend,
            disconnect: mockProducerDisconnect,
        })),
        consumer: jest.fn(() => ({
            connect: mockConsumerConnect,
            subscribe: mockConsumerSubscribe,
            run: mockConsumerRun,
            disconnect: mockConsumerDisconnect,
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

beforeEach(() => {
    jest.clearAllMocks();
});

// ==================== POST /kafka/publish ====================
describe("POST /kafka/publish", () => {
    test("publie un message avec succes", async () => {
        const res = await request(app)
            .post("/kafka/publish")
            .send({ message: "Hello Kafka", eventType: "TEST" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe("Message published in Kafka");
        expect(mockProducerSend).toHaveBeenCalled();
    });

    test("publie avec valeurs par defaut si body vide", async () => {
        const res = await request(app)
            .post("/kafka/publish")
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("retourne 500 si le producer echoue", async () => {
        mockProducerSend.mockRejectedValueOnce(new Error("Kafka down"));

        const res = await request(app)
            .post("/kafka/publish")
            .send({ message: "test" });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Publication failed");
    });
});

// ==================== GET /kafka/ping ====================
describe("GET /kafka/ping", () => {
    test("retourne succes si Kafka repond", async () => {
        const res = await request(app).get("/kafka/ping");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe("Kafka connection successful");
    });

    test("retourne 500 si Kafka ne repond pas", async () => {
        mockProducerSend.mockRejectedValueOnce(new Error("Kafka down"));

        const res = await request(app).get("/kafka/ping");

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

// ==================== POST /kafka/notify ====================
describe("POST /kafka/notify", () => {
    test("retourne ok et emet via socket.io si io est defini", async () => {
        const mockEmit = jest.fn();
        app.set("io", { emit: mockEmit });

        const data = {
            content: { content: "Un message" },
            receivedAt: "12:00:00",
            sentAt: "11:59:00",
        };

        const res = await request(app)
            .post("/kafka/notify")
            .send(data);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(mockEmit).toHaveBeenCalledWith("kafka-log", expect.objectContaining({
            contenu: "Un message",
            source: "kafka-worker",
        }));

        app.set("io", undefined);
    });

    test("retourne ok meme sans io", async () => {
        app.set("io", undefined);

        const res = await request(app)
            .post("/kafka/notify")
            .send({ content: "test" });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    test("gere content en string", async () => {
        const mockEmit = jest.fn();
        app.set("io", { emit: mockEmit });

        const res = await request(app)
            .post("/kafka/notify")
            .send({ content: "simple string" });

        expect(res.status).toBe(200);
        expect(mockEmit).toHaveBeenCalledWith("kafka-log", expect.objectContaining({
            contenu: "simple string",
        }));

        app.set("io", undefined);
    });
});

// ==================== POST /kafka/replay ====================
describe("POST /kafka/replay", () => {
    test("demarre le replay avec succes", async () => {
        const res = await request(app).post("/kafka/replay");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe("Replay démarré");
        expect(res.body.groupId).toBeDefined();
    });

    test("retourne 500 si le consumer echoue", async () => {
        mockConsumerConnect.mockRejectedValueOnce(new Error("Consumer error"));

        const res = await request(app).post("/kafka/replay");

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});
