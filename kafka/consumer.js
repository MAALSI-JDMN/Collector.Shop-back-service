const kafka = require('./client');

const consumer = kafka.consumer({ groupId: 'shop-backend-worker' });
const admin = kafka.admin();

const runWorker = async () => {
    try {
        await consumer.connect();
        await admin.connect();
        const topicName = 'quickstart-events';
        const existingTopics = await admin.listTopics();

        if (!existingTopics.includes(topicName)) {
            console.log(`The topic '${topicName}' does not exist. Creation in progress...`);
            await admin.createTopics({
                topics: [{
                    topic: topicName,
                    numPartitions: 1,
                    replicationFactor: 1
                }],
            });
            console.log(`Topic '${topicName}' created successfully!`);
        }
        await admin.disconnect();
        await consumer.subscribe({ topic: topicName, fromBeginning: true });

        console.log(`#       WORKER READY - OPERATIONAL SYSTEM      #`);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const payload = message.value.toString();
                console.log(`Received: ${payload}`);
                // ICI : Code métier futur
            },
        });

    } catch (error) {
        console.error("Critical error:", error);

    }
};

runWorker();