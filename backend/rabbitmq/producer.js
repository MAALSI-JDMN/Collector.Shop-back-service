const { getChannel, QUEUE_NAME } = require('./client');


const publish = async (message) => {
    const channel = getChannel();

    if (!channel) {
        throw new Error('[RabbitMQ] Canal non initialisé. Appelez connect() d\'abord.');
    }

    const payload = JSON.stringify(message);

    // Envoie le message dans la queue
    channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), {
        persistent: true // ATTENTION : Le message survit aux redémarrages du broker
    });

    console.log(`[RabbitMQ] Message publié → ${QUEUE_NAME} (${payload.length} octets)`);

    return true;
};

module.exports = { publish };
