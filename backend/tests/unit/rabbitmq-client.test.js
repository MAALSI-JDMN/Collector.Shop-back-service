jest.mock("amqplib", () => ({
    connect: jest.fn(),
}));

const amqp = require("amqplib");
const rabbitmq = require("../../rabbitmq/client");

describe("RabbitMQ client", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("getQueueName retourne le nom de la queue", () => {
        expect(rabbitmq.getQueueName()).toBe("quickstart-events");
    });

    test("QUEUE_NAME est exporte", () => {
        expect(rabbitmq.QUEUE_NAME).toBe("quickstart-events");
    });
});
