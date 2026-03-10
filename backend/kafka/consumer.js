const { kafka, clientId } = require('./client');
const constants = require('./constants');
const { ensureTopicExists } = require('./kafka-admin');
const { createStandardMessage } = require('./../formatter/data-formatter');

const groupId = process.env.KAFKA_GROUP_ID || 'shop_consumer_kafka';
const API_NOTIFY_URL = process.env.API_NOTIFY_URL || 'http://api:3000/kafka/notify';


const workerId = clientId;

const consumer = kafka.consumer({ groupId: groupId });

/**
 * shutdown
 */
const shutdown = async () => {
    console.warn(`[${workerId}] Arrêt du Consumer...`);
    try {
        await consumer.disconnect();
        console.log(`[${workerId}] Déconnecté proprement.`);
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
};
['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(type => process.once(type, shutdown));
['unhandledRejection', 'uncaughtException'].forEach(type => process.on(type, shutdown));

/**
 * Logic send data to API
 * @param {*} standardizedData
 *
 */
const notifyAPI = async (standardizedData) => {
    try {
        const response = await fetch(API_NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(standardizedData)
        });

        if (!response.ok) console.error(`[API] Erreur HTTP ${response.status}`);

    } catch (error) {
        console.error(`[API] Service injoignable: ${error.message}`);
    }
};

/**
 * MAIN LOOP
 */
const runWorker = async () => {
    try {
        await ensureTopicExists(kafka);

        console.info(`[${workerId}] Connexion au broker...`);
        await consumer.connect();

        await consumer.subscribe({
            topic: constants.TOPIC_COMMAND,
            fromBeginning: false
        });

        console.info(`[${workerId}] PRÊT (Groupe: ${groupId})`);
        console.info(`En attente de messages sur "${constants.TOPIC_COMMAND}"...`);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value.toString();
                const msgOffset = message.offset;
                const msgKey = message.key ? message.key.toString() : null;

                console.log(`\n--- [KAFKA] Message Reçu ---`);
                console.log(`| Key: ${msgKey} | Offset: ${msgOffset} | Part: ${partition}`);
                console.log(`---------------------------------`);

                const standardizedData = createStandardMessage({
                    source: 'KAFKA',
                    workerId: workerId,
                    messageId: `offset-${msgOffset}`,
                    key: msgKey,
                    content: rawValue,
                    meta: { partition, offset: msgOffset }
                });

                await notifyAPI(standardizedData);
            },
        });

    } catch (error) {
        console.error(`[${workerId}] Erreur critique:`, error);
        process.exit(1);
    }
};

module.exports = runWorker;

if (require.main === module) {
    runWorker().catch(err => console.error('Erreur fatale:', err));
}