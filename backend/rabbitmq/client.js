const amqp = require('amqplib');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'quickstart-events';

let connection = null;
let channel = null;

// Connexion avec retry policy
const connect = async (retries = 5, delay = 3000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[RabbitMQ] Tentative de connexion ${attempt}/${retries}...`);
            connection = await amqp.connect(rabbitmqUrl);
            channel = await connection.createChannel();

            // Déclare la queue (crée si n'existe pas)
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            console.log(`[RabbitMQ] Connecté → ${rabbitmqUrl}`);

            // Gestion de la fermeture de connexion
            connection.on('close', () => {
                console.log('[RabbitMQ] Connexion fermée');
                channel = null;
                connection = null;
            });

            connection.on('error', (err) => {
                console.error('[RabbitMQ] Erreur de connexion:', err.message);
            });

            return { connection, channel };
        } catch (error) {
            console.error(`[RabbitMQ] Échec connexion (tentative ${attempt}):`, error.message);

            if (attempt < retries) {
                console.log(`[RabbitMQ] Nouvelle tentative dans ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error(`[RabbitMQ] Impossible de se connecter après ${retries} tentatives`);
            }
        }
    }
};

const getChannel = () => channel;
const getConnection = () => connection;
const getQueueName = () => QUEUE_NAME;

module.exports = {
    connect,
    getChannel,
    getConnection,
    getQueueName,
    QUEUE_NAME
};
