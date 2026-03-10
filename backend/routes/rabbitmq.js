var express = require('express');
var router = express.Router();
var rabbitmq = require('../rabbitmq/client');
var { publish } = require('../rabbitmq/producer');
const { createMessagingRouter } = require('./messaging');

// Initialisation de la connexion RabbitMQ
const initRabbitMQ = async () => {
    try {
        await rabbitmq.connect();
    } catch (error) {
        console.error('Erreur connexion RabbitMQ:', error);
    }
};
initRabbitMQ();

// Routes communes (publish, ping, notify)
router.use('/', createMessagingRouter({
    name: 'RabbitMQ',
    publishFn: publish,
    socketEvent: 'rabbitmq-log',
}));

module.exports = router;
