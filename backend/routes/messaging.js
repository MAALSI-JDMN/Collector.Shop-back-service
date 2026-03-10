var express = require('express');

/**
 * Crée les routes communes publish, ping et notify pour un service de messaging.
 * @param {object} options
 * @param {string} options.name - Nom du service (ex: "Kafka", "RabbitMQ")
 * @param {function} options.publishFn - Fonction d'envoi de message (reçoit un payload)
 * @param {string} options.socketEvent - Nom de l'événement Socket.io (ex: "kafka-log")
 * @param {function} [options.extractContent] - Extraction du contenu pour notify (optionnel)
 */
const createMessagingRouter = ({ name, publishFn, socketEvent, extractContent }) => {
    const router = express.Router();

    // POST /publish
    router.post('/publish', async function(req, res) {
        const { message, eventType, sentAt } = req.body;

        try {
            await publishFn({
                content: message || "Automatic message",
                type: eventType || "INFO",
                date: new Date().toISOString(),
                sentAt: sentAt || Date.now()
            });

            res.status(200).json({
                success: true,
                status: `Message published in ${name}`,
            });
        } catch (error) {
            console.error(`Erreur envoi ${name}:`, error);
            res.status(500).json({ success: false, error: 'Publication failed' });
        }
    });

    // GET /ping
    router.get('/ping', async function(req, res) {
        try {
            const payload = {
                content: "PING - Connectivity test",
                type: "PING",
                date: new Date().toISOString()
            };

            await publishFn(payload);

            res.status(200).json({
                success: true,
                status: `${name} connection successful`,
                data: payload
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: `${name} connection failed` });
        }
    });

    // POST /notify - Webhook appelé par le Worker Docker
    router.post('/notify', function(req, res) {
        const io = req.app.get('io');
        const data = req.body;

        console.log(`[${name}] Notification reçue du Worker`);

        if (io) {
            const contenu = extractContent
                ? extractContent(data)
                : data.contenu || JSON.stringify(data);

            io.emit(socketEvent, {
                contenu: String(contenu),
                date: data.receivedAt || data.date || new Date().toLocaleTimeString(),
                source: data.source || `${name.toLowerCase()}-worker`,
                origin: data.origin || 'Docker Worker',
                sentAt: data.sentAt
            });
        }

        res.status(200).json({ status: 'ok' });
    });

    return router;
};

module.exports = { createMessagingRouter };
