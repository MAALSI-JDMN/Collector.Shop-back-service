var express = require('express');
var router = express.Router();
var rabbitmq = require('../rabbitmq/client');
var { publish } = require('../rabbitmq/producer');

// Initialisation de la connexion RabbitMQ
const initRabbitMQ = async () => {
    try {
        await rabbitmq.connect();
    } catch (error) {
        console.error('Erreur connexion RabbitMQ:', error);
    }
};
initRabbitMQ();

// URL : POST http://localhost:3000/rabbitmq/publish
router.post('/publish', async function(req, res, next) {
    const { message, eventType, sentAt } = req.body;

    try {
        await publish({
            content: message || "Automatic message",
            type: eventType || "INFO",
            date: new Date().toISOString(),
            sentAt: sentAt || Date.now()
        });

        res.status(200).json({
            success: true,
            status: 'Message published in RabbitMQ',
            data: { message }
        });

    } catch (error) {
        console.error("Erreur envoi RabbitMQ:", error);
        res.status(500).json({ success: false, error: 'Publication failed' });
    }
});

// URL : GET http://localhost:3000/rabbitmq/ping
router.get('/ping', async function(req, res, next) {
    try {
        const payload = {
            content: "PING - Connectivity test",
            type: "PING",
            date: new Date().toISOString()
        };

        await publish(payload);

        res.status(200).json({
            success: true,
            status: 'RabbitMQ connection successful',
            data: payload
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'RabbitMQ connection failed' });
    }
});

// URL : POST http://localhost:3000/rabbitmq/notify
// Webhook appelé par le Worker Docker pour notifier l'API d'un message reçu
router.post('/notify', function(req, res) {
    const io = req.app.get('io');
    const data = req.body;

    console.log('[RabbitMQ] Notification reçue du Worker:', data);

    // Émet vers tous les clients Socket.io connectés
    if (io) {
        io.emit('rabbitmq-log', {
            contenu: data.contenu || JSON.stringify(data),
            date: data.date || new Date().toLocaleTimeString(),
            source: data.source || 'rabbitmq-worker',
            origin: data.origin || 'Docker Worker',
            sentAt: data.sentAt
        });
    }

    res.status(200).json({ status: 'ok' });
});

module.exports = router;
