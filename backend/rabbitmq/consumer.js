const { connect, QUEUE_NAME } = require('./client');

const API_NOTIFY_URL = process.env.API_NOTIFY_URL || 'http://api:3000/rabbitmq/notify';

const notifyAPI = async (data) => {
    try {
        const response = await fetch(API_NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            console.error(`[RabbitMQ Worker] Erreur notification API: ${response.status}`);
        }
    } catch (error) {
        console.error('[RabbitMQ Worker] Erreur appel API:', error.message);
    }
};

const runWorker = async () => {
    try {
        const { channel } = await connect();

        console.log(`[RabbitMQ Worker] CONSUMER PRÊT - En attente de messages sur "${QUEUE_NAME}"...`);
        console.log(`[RabbitMQ Worker] Notifications vers: ${API_NOTIFY_URL}`);

        // Consomme les messages de la queue
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const payload = msg.content.toString();
                console.log(`[RabbitMQ Worker] Message reçu: ${payload}`);

                let sentAt = null;
                try {
                    const parsed = JSON.parse(payload);
                    sentAt = parsed.sentAt;
                } catch (e) {
                    // contenu non JSON, sentAt reste null
                }

                // Prépare les données pour l'API
                const notificationData = {
                    contenu: payload,
                    date: new Date().toLocaleTimeString(),
                    source: 'Worker Docker',
                    origin: 'Docker Worker',
                    sentAt: sentAt
                };

                // Notifie l'API via HTTP POST
                await notifyAPI(notificationData);

                // retire de la queue
                channel.ack(msg);
            }
        }, {
            noAck: false
        });

    } catch (error) {
        console.error('[RabbitMQ Worker] Erreur Consumer:', error);
        process.exit(1);
    }
};

module.exports = runWorker;

if (require.main === module) {
    console.log('[RabbitMQ Worker] Démarrage du worker autonome...');
    runWorker().catch(err => console.error('[RabbitMQ Worker] Erreur fatale:', err));
}
