var express = require('express');
var router = express.Router();
var { kafka } = require('../kafka/client');
const constants = require("../kafka/constants");
const { createMessagingRouter } = require('./messaging');

const producer = kafka.producer();

const initProducer = async () => {
    try {
        await producer.connect();
    } catch (error) {
        console.error('Error login to producer Kafka :', error);
    }
};
initProducer();

// Fonction de publication Kafka
const publishToKafka = async (payload) => {
    await producer.send({
        topic: constants.TOPIC_COMMAND,
        messages: [{ value: JSON.stringify(payload) }],
    });
};

// Extraction du contenu depuis le format standardisé du data-formatter
const extractKafkaContent = (data) => {
    if (typeof data.content === 'object' && data.content !== null) {
        return data.content.content || JSON.stringify(data.content);
    }
    return data.content || data.contenu || JSON.stringify(data);
};

// Routes communes (publish, ping, notify)
router.use('/', createMessagingRouter({
    name: 'Kafka',
    publishFn: publishToKafka,
    socketEvent: 'kafka-log',
    extractContent: extractKafkaContent,
}));

// POST /kafka/replay - Replay tous les messages Kafka depuis le début
router.post('/replay', async function(req, res) {
    const io = req.app.get('io');
    const replayGroupId = `demo-replay-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`[Kafka Replay] Démarrage replay avec groupId: ${replayGroupId}`);

    try {
        const replayConsumer = kafka.consumer({ groupId: replayGroupId });

        await replayConsumer.connect();
        await replayConsumer.subscribe({ topic: constants.TOPIC_COMMAND, fromBeginning: true });

        let messageCount = 0;
        const startTime = Date.now();

        const replayPromise = new Promise((resolve, reject) => {
            let idleTimeout;

            const resetIdleTimeout = () => {
                if (idleTimeout) clearTimeout(idleTimeout);
                idleTimeout = setTimeout(async () => {
                    console.log(`[Kafka Replay] Replay terminé: ${messageCount} messages en ${Date.now() - startTime}ms`);
                    await replayConsumer.disconnect();
                    resolve(messageCount);
                }, 2000);
            };

            resetIdleTimeout();

            replayConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    resetIdleTimeout();
                    messageCount++;

                    const payload = message.value.toString();

                    if (io) {
                        io.emit('kafka-log', {
                            contenu: payload,
                            date: new Date().toLocaleTimeString(),
                            source: 'kafka-replay',
                            origin: 'Replay Historique',
                            sentAt: null,
                            isReplay: true
                        });
                    }
                }
            }).catch(reject);
        });

        res.status(200).json({
            success: true,
            status: 'Replay démarré',
            groupId: replayGroupId
        });

    } catch (error) {
        console.error('[Kafka Replay] Erreur:', error);
        res.status(500).json({ success: false, error: 'Replay failed: ' + error.message });
    }
});

module.exports = router;
