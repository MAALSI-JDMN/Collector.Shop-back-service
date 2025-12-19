const kafka = require('./client');
const consumer = kafka.consumer({ groupId: 'shop-backend-worker' });

const runWorker = async (io) => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'quickstart-events', fromBeginning: true });

        console.log(`CONSUMER PRÊT - En attente de messages...`);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const payload = message.value.toString();
                console.log(`Log Serveur: ${payload}`);

                if (io) {
                    io.emit('nouvelle-commande', {
                        contenu: payload,
                        date: new Date().toLocaleTimeString()
                    });
                }
            },
        });

    } catch (error) {
        console.error("Erreur Consumer:", error);
    }
};

module.exports = runWorker;

if (require.main === module) {
    runWorker().catch(err => console.error("Erreur fatale worker:", err));
}