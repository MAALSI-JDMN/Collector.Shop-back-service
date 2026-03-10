/**
 * create a standardized message object
 * @param source
 * @param workerId
 * @param messageId
 * @param key
 * @param content
 * @param meta
 * @returns {{network: *, workerId: *, messageId: *, key, content: *, receivedAt: string, sentAt: null, meta}}
 */
const createStandardMessage = ({ source, workerId, messageId, key, content, meta }) => {

    let payload = content;
    let sentAt = null;

    try {
        if (typeof content === 'string') {
            const parsed = JSON.parse(content);
            payload = parsed;
            sentAt = parsed.sentAt || parsed.date;
        }
    } catch (e) {

    }

    return {
        network: source,
        workerId: workerId,
        messageId: messageId,
        key: key || 'N/A',
        content: payload,
        receivedAt: new Date().toISOString(),
        sentAt: sentAt,
        meta: meta || {}
    };
};

module.exports = { createStandardMessage };