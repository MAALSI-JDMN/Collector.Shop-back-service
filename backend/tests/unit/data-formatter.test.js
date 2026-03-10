const { createStandardMessage } = require("../../formatter/data-formatter");

describe("createStandardMessage", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("formate un message avec contenu JSON string", () => {
        const content = JSON.stringify({ text: "hello", sentAt: "2025-01-15T11:00:00Z" });

        const result = createStandardMessage({
            source: "kafka",
            workerId: "worker-1",
            messageId: "msg-1",
            key: "key-1",
            content,
            meta: { partition: 0 },
        });

        expect(result.network).toBe("kafka");
        expect(result.workerId).toBe("worker-1");
        expect(result.messageId).toBe("msg-1");
        expect(result.key).toBe("key-1");
        expect(result.content).toEqual({ text: "hello", sentAt: "2025-01-15T11:00:00Z" });
        expect(result.sentAt).toBe("2025-01-15T11:00:00Z");
        expect(result.receivedAt).toBe("2025-01-15T12:00:00.000Z");
        expect(result.meta).toEqual({ partition: 0 });
    });

    test("utilise le champ 'date' comme sentAt si pas de sentAt", () => {
        const content = JSON.stringify({ text: "hello", date: "2025-01-15T10:00:00Z" });

        const result = createStandardMessage({
            source: "rabbitmq",
            workerId: "w-2",
            messageId: "m-2",
            content,
        });

        expect(result.sentAt).toBe("2025-01-15T10:00:00Z");
    });

    test("garde le contenu brut si ce n'est pas du JSON", () => {
        const result = createStandardMessage({
            source: "kafka",
            workerId: "w-1",
            messageId: "m-1",
            content: "plain text message",
        });

        expect(result.content).toBe("plain text message");
        expect(result.sentAt).toBeNull();
    });

    test("gere un contenu deja objet (non string)", () => {
        const obj = { data: "value" };

        const result = createStandardMessage({
            source: "kafka",
            workerId: "w-1",
            messageId: "m-1",
            content: obj,
        });

        // typeof obj !== 'string', donc pas de JSON.parse
        expect(result.content).toEqual({ data: "value" });
        expect(result.sentAt).toBeNull();
    });

    test("utilise 'N/A' si key est absent", () => {
        const result = createStandardMessage({
            source: "kafka",
            workerId: "w-1",
            messageId: "m-1",
            content: "test",
        });

        expect(result.key).toBe("N/A");
    });

    test("utilise {} si meta est absent", () => {
        const result = createStandardMessage({
            source: "kafka",
            workerId: "w-1",
            messageId: "m-1",
            content: "test",
        });

        expect(result.meta).toEqual({});
    });
});
