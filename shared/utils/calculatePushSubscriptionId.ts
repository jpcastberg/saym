import hash from "object-hash";

function calculatePushSubscriptionId(subscription: PushSubscriptionJSON) {
    if (subscription.endpoint) {
        return hash(subscription.endpoint).slice(0, 8);
    }

    return null;
}

export default calculatePushSubscriptionId;
