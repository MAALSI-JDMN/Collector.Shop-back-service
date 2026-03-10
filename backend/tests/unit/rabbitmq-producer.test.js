jest.mock("../../rabbitmq/client", () => ({
    getChannel: jest.fn(),
    QUEUE_NAME: "quickstart-events",
}));

const { publish } = require("../../rabbitmq/producer");
const { getChannel } = require("../../rabbitmq/client");

describe("RabbitMQ producer - publish", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("envoie un message dans la queue", async () => {
        const mockChannel = {
            sendToQueue: jest.fn().mockReturnValue(true),
        };
        getChannel.mockReturnValue(mockChannel);

        const message = { content: "hello", type: "INFO" };
        const result = await publish(message);

        expect(result).toBe(true);
        expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
            "quickstart-events",
            expect.any(Buffer),
            { persistent: true }
        );

        // Verifie que le payload est bien serialise
        const sentBuffer = mockChannel.sendToQueue.mock.calls[0][1];
        expect(JSON.parse(sentBuffer.toString())).toEqual(message);
    });

    test("lance une erreur si le canal n'est pas initialise", async () => {
        getChannel.mockReturnValue(null);

        await expect(publish({ test: true })).rejects.toThrow(
            "[RabbitMQ] Canal non initialisé"
        );
    });
});
