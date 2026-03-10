const constants = require("../../kafka/constants");

describe("Kafka constants", () => {
    test("TOPIC_COMMAND est defini", () => {
        expect(constants.TOPIC_COMMAND).toBe("command-events");
    });
});
