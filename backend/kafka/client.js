const { Kafka, logLevel} = require('kafkajs');

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';
const clientId = 'kafka-serv-command';


/*
 * Initialisation du client KafkaJS
 * LogLevel [NOTHING, ERROR, WARN (prod), INFO, DEBUG]
 */
const kafka = new Kafka({
    clientId: clientId,
    brokers: [kafkaBroker],
    logLevel: logLevel.WARN,
});

module.exports = { kafka, clientId };