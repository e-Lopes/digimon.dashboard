// Shared validation helpers for forms.
(function initValidation() {
    function isNonEmptyText(value, minLength) {
        const trimmed = String(value || '').trim();
        return trimmed.length >= (minLength || 1);
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

    window.validation = Object.freeze({
        isNonEmptyText,
        isValidOptionalUrl,
        isPositiveInteger
    });
})();
