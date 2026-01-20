const { connect, QUEUE_NAME } = require('./client');

const runWorker = async (io) => {
    try {
        const { channel } = await connect();

        console.log(`[RabbitMQ] CONSUMER PRÊT - En attente de messages sur "${QUEUE_NAME}"...`);

        // Consomme les messages de la queue
        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                const payload = msg.content.toString();
                console.log(`[RabbitMQ] Log Serveur: ${payload}`);

                // Émet vers Socket.io si disponible
                if (io) {
                    io.emit('nouvelle-commande', {
                        contenu: payload,
                        date: new Date().toLocaleTimeString(),
                        source: 'rabbitmq'
                    });
                }

                // Acquitte le message (le retire de la queue)
                channel.ack(msg);
            }
        }, {
            noAck: false // Acquittement manuel requis
        });

    } catch (error) {
        console.error('[RabbitMQ] Erreur Consumer:', error);
    }
};

module.exports = runWorker;

// Exécution directe si lancé comme script
if (require.main === module) {
    runWorker().catch(err => console.error('[RabbitMQ] Erreur fatale worker:', err));
}
