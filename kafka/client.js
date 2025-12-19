const { Kafka, logLevel} = require('kafkajs');

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
    clientId: 'mon-backend-express',
    brokers: [kafkaBroker],
    logLevel: logLevel.WARN,
});

module.exports = kafka;