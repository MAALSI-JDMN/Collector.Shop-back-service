const { ensureTopicExists } = require("../../kafka/kafka-admin");

describe("ensureTopicExists", () => {
    let mockAdmin;

    beforeEach(() => {
        mockAdmin = {
            connect: jest.fn().mockResolvedValue(),
            listTopics: jest.fn(),
            createTopics: jest.fn().mockResolvedValue(),
            disconnect: jest.fn().mockResolvedValue(),
        };
    });

    test("ne cree pas le topic s'il existe deja", async () => {
        mockAdmin.listTopics.mockResolvedValue(["command-events", "other-topic"]);

        const kafkaClient = { admin: () => mockAdmin };
        await ensureTopicExists(kafkaClient);

        expect(mockAdmin.connect).toHaveBeenCalled();
        expect(mockAdmin.listTopics).toHaveBeenCalled();
        expect(mockAdmin.createTopics).not.toHaveBeenCalled();
        expect(mockAdmin.disconnect).toHaveBeenCalled();
    });

    test("cree le topic s'il n'existe pas", async () => {
        mockAdmin.listTopics.mockResolvedValue(["other-topic"]);

        const kafkaClient = { admin: () => mockAdmin };
        await ensureTopicExists(kafkaClient);

        expect(mockAdmin.createTopics).toHaveBeenCalledWith({
            topics: [{
                topic: "command-events",
                numPartitions: 1,
                replicationFactor: 1,
            }],
        });
        expect(mockAdmin.disconnect).toHaveBeenCalled();
    });

    test("gere les erreurs et deconnecte quand meme", async () => {
        mockAdmin.listTopics.mockRejectedValue(new Error("Connection failed"));

        const kafkaClient = { admin: () => mockAdmin };
        await ensureTopicExists(kafkaClient);

        expect(mockAdmin.disconnect).toHaveBeenCalled();
    });
});
