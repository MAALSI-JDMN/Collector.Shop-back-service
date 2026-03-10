var express = require('express');
var router = express.Router();
var { kafka } = require('../kafka/client');
const constants = require("../kafka/constants");

const producer = kafka.producer();

const initProducer = async () => {
    try {
        await producer.connect();
    } catch (error) {
        console.error('Error login to producer Kafka :', error);
    }
};
initProducer();

// URL : POST http://localhost:3000/kafka/publish
router.post('/publish', async function(req, res, next) {
    const { message, eventType, sentAt } = req.body;

    try {
        await producer.send({
            topic: constants.TOPIC_COMMAND,
            messages: [
                {
                    value: JSON.stringify({
                        content: message || "Automatic message",
                        type: eventType || "INFO",
                        date: new Date().toISOString(),
                        sentAt: sentAt || Date.now()
                    })
                },
            ],
        });

        res.status(200).json({
            success: true,
            status: 'Message published in Kafka',
            data: { message }
        });

    } catch (error) {
        console.error("Error send Kafka:", error);
        res.status(500).json({ success: false, error: 'Publication failed' });
    }
});

// URL : GET http://localhost:3000/kafka/ping
router.get('/ping', async function(req, res, next) {
    try {
        const payload = {
            content: "PING - Connectivity test",
            type: "PING",
            date: new Date().toISOString()
        };

        await producer.send({
            topic: constants.TOPIC_COMMAND,
            messages: [{ value: JSON.stringify(payload) }],
        });

        res.status(200).json({
            success: true,
            status: 'Kafka connection successful',
            data: payload
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Kafka connection failed' });
    }
});

// URL : POST http://localhost:3000/kafka/notify
// Webhook appelé par le Worker Docker pour notifier l'API d'un message reçu
router.post('/notify', function(req, res) {
    const io = req.app.get('io');
    const data = req.body;

    console.log('[Kafka] Notification reçue du Worker:', data);

    // Émet vers tous les clients Socket.io connectés
    if (io) {
        // Extraire le message lisible depuis le format standardisé du data-formatter
        let contenu;
        if (typeof data.content === 'object' && data.content !== null) {
            contenu = data.content.content || JSON.stringify(data.content);
        } else {
            contenu = data.content || data.contenu || JSON.stringify(data);
        }

        io.emit('kafka-log', {
            contenu: String(contenu),
            date: data.receivedAt || new Date().toLocaleTimeString(),
            source: 'kafka-worker',
            origin: 'Docker Worker',
            sentAt: data.sentAt
        });
    }

    res.status(200).json({ status: 'ok' });
});

// URL : POST http://localhost:3000/kafka/replay
// Replay tous les messages Kafka depuis le début (pour démo)
router.post('/replay', async function(req, res) {
    const io = req.app.get('io');
    const replayGroupId = `demo-replay-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`[Kafka Replay] Démarrage replay avec groupId: ${replayGroupId}`);

    try {
        // Crée un consumer temporaire avec un nouveau groupId
        const replayConsumer = kafka.consumer({ groupId: replayGroupId });

        await replayConsumer.connect();
        await replayConsumer.subscribe({ topic: constants.TOPIC_COMMAND, fromBeginning: true });

        let messageCount = 0;
        const startTime = Date.now();

        // Promesse pour attendre la fin du replay
        const replayPromise = new Promise((resolve, reject) => {
            let idleTimeout;

            const resetIdleTimeout = () => {
                if (idleTimeout) clearTimeout(idleTimeout);
                // Si pas de message pendant 2s, on considère le replay terminé
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

                    // Émet directement via Socket.io avec flag isReplay
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

        // Répond immédiatement, le replay continue en background
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