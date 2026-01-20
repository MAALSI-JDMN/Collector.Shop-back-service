const { getChannel, QUEUE_NAME } = require('./client');

// Publie un message dans la queue RabbitMQ
const publish = async (message) => {
    const channel = getChannel();

    if (!channel) {
        throw new Error('[RabbitMQ] Canal non initialisé. Appelez connect() d\'abord.');
    }

    const payload = JSON.stringify(message);

    // Envoie le message dans la queue
    channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), {
        persistent: true // Le message survit aux redémarrages du broker
    });

    console.log(`[RabbitMQ] Message publié → ${QUEUE_NAME}:`, payload);

    return true;
};

module.exports = { publish };
