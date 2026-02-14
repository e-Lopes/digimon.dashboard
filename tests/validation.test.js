const test = require('node:test');
const assert = require('node:assert/strict');

function isNonEmptyText(value, minLength = 1) {
    const trimmed = String(value || '').trim();
    return trimmed.length >= minLength;
}

function isValidOptionalUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return true;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function isPositiveInteger(value, min, max) {
    const n = Number(value);
    if (!Number.isInteger(n)) return false;
    if (min != null && n < min) return false;
    if (max != null && n > max) return false;
    return n > 0;
}

test('isNonEmptyText validates minimum length', () => {
    assert.equal(isNonEmptyText(' Digimon ', 2), true);
    assert.equal(isNonEmptyText(' a ', 2), false);
});

test('isValidOptionalUrl accepts empty or http/https URLs', () => {
    assert.equal(isValidOptionalUrl(''), true);
    assert.equal(isValidOptionalUrl('https://example.com'), true);
    assert.equal(isValidOptionalUrl('ftp://example.com'), false);
    assert.equal(isValidOptionalUrl('not-a-url'), false);
});

test('isPositiveInteger validates bounds', () => {
    assert.equal(isPositiveInteger(10, 1, 99), true);
    assert.equal(isPositiveInteger(0, 1, 99), false);
    assert.equal(isPositiveInteger(150, 1, 99), false);
    assert.equal(isPositiveInteger('3', 1, 99), true);
});
