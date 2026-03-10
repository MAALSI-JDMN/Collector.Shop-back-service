const constants = require('./constants');

/**
 * Verify existence of topic and create it if not exists
 * @param kafkaClient
 * @returns {Promise<void>}
 */
const ensureTopicExists = async (kafkaClient) => {
    const admin = kafkaClient.admin();
    try {
        await admin.connect();
        const topics = await admin.listTopics();

        if (!topics.includes(constants.TOPIC_COMMAND)) {
            console.warn(`[Admin] Topic "${constants.TOPIC_COMMAND}" manquant. Création...`);
            await admin.createTopics({
                topics: [{
                    topic: constants.TOPIC_COMMAND,
                    numPartitions: 1,
                    replicationFactor: 1
                }]
            });
            console.info(`[Admin] Topic créé.`);
        }
    } catch (error) {
        console.error('[Admin] Erreur:', error.message);
    } finally {
        await admin.disconnect();
    }
};

module.exports = { ensureTopicExists };