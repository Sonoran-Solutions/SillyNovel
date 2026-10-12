import { createHash } from 'node:crypto';

export const SOURCE_FINGERPRINT_VERSION = 'sn-source-v1';

function requiredString(value, field) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${field} must be a non-empty string`);
    }
    return value;
}

function canonicalAuthor(author) {
    if (!author || typeof author !== 'object') {
        return ['unresolved', null];
    }
    if (author.kind === 'resolved') {
        return ['resolved', requiredString(author.characterKey, 'author.characterKey')];
    }
    if (author.kind === 'unresolved') {
        return ['unresolved', typeof author.label === 'string' ? author.label : null];
    }
    throw new TypeError('author.kind must be resolved or unresolved');
}

function canonicalSwipe(swipe) {
    if (swipe == null) {
        return null;
    }
    if (typeof swipe !== 'object' || typeof swipe.text !== 'string') {
        throw new TypeError('swipe must contain exact text');
    }
    const id = swipe.id == null ? null : String(swipe.id);
    return [id, swipe.text];
}

/**
 * Serializes the canonical history prefix. chatId and indexHint are deliberately
 * excluded: the first belongs to the anchor owner, while the second is only a locator hint.
 */
export function serializeSourcePrefix({ owner, scope, messages, selectedIndex }) {
    const userStoreKey = requiredString(owner?.userStoreKey, 'owner.userStoreKey');
    const scopeKind = requiredString(scope?.kind, 'scope.kind');
    const scopeKey = requiredString(scope?.key, 'scope.key');
    if (!Array.isArray(messages) || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= messages.length) {
        throw new TypeError('selectedIndex must identify a message in messages');
    }

    const prefix = messages.slice(0, selectedIndex + 1).map((message, index) => {
        if (!message || typeof message !== 'object' || typeof message.text !== 'string') {
            throw new TypeError(`messages[${index}].text must be an exact string`);
        }
        const role = typeof message.role === 'string' ? message.role : 'unresolved';
        return [role, canonicalAuthor(message.author), message.text, canonicalSwipe(message.swipe)];
    });

    return JSON.stringify([SOURCE_FINGERPRINT_VERSION, userStoreKey, scopeKind, scopeKey, prefix]);
}

export function fingerprintSourcePrefix(input) {
    return createHash('sha256').update(serializeSourcePrefix(input), 'utf8').digest('hex');
}

export function createSourceAnchor({ owner, scope, chatId, indexHint, messages, selectedIndex }) {
    return {
        version: SOURCE_FINGERPRINT_VERSION,
        userStoreKey: requiredString(owner?.userStoreKey, 'owner.userStoreKey'),
        scope: {
            kind: requiredString(scope?.kind, 'scope.kind'),
            key: requiredString(scope?.key, 'scope.key'),
        },
        chatId: requiredString(chatId, 'chatId'),
        locator: {
            indexHint: Number.isInteger(indexHint) && indexHint >= 0 ? indexHint : null,
        },
        prefixSha256: fingerprintSourcePrefix({ owner, scope, messages, selectedIndex }),
    };
}
