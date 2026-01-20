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
    const { message, eventType } = req.body;

    try {
        await publish({
            content: message || "Automatic message",
            type: eventType || "INFO",
            date: new Date().toISOString()
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
        await publish({
            content: "PING - Connectivity test from the browser",
            type: "PING",
            date: new Date().toISOString()
        });

        res.send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1>Connexion RabbitMQ Réussie</h1>
                <p>Le message "PING" a été envoyé à la queue RabbitMQ.</p>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send("<h1>Erreur de connexion RabbitMQ</h1>");
    }
});

module.exports = router;
