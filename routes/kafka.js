var express = require('express');
var router = express.Router();
var kafka = require('../kafka/client');

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
    const { message, eventType } = req.body;

    try {
        await producer.send({
            topic: 'quickstart-events',
            messages: [
                {
                    value: JSON.stringify({
                        content: message || "Automatic message",
                        type: eventType || "INFO",
                        date: new Date().toISOString()
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
        await producer.send({
            topic: 'quickstart-events',
            messages: [
                { value: "PING - Connectivity test from the browser" },
            ],
        });

        res.send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1>Connexion Réussie </h1>
                <p>Le message "PING" a été envoyé au topic Kafka.</p>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send("<h1>Erreur de connexion Kafka</h1>");
    }
});

module.exports = router;