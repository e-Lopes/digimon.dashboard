// Shared helpers for consistent loading/empty/error states.
(function initUiState() {
    function setVisible(element, visible) {
        if (!element) return;
        element.style.display = visible ? '' : 'none';
    }

    function setLoading(container, loadingElement, isLoading) {
        setVisible(loadingElement, isLoading);
        if (container) {
            container.style.opacity = isLoading ? '0.6' : '1';
        }
    }

    function setEmpty(emptyElement, isEmpty) {
        setVisible(emptyElement, isEmpty);
    }

    function setError(errorElement, message) {
        if (!errorElement) return;
        if (message) {
            errorElement.textContent = message;
            setVisible(errorElement, true);
        } else {
            setVisible(errorElement, false);
        }
    }

    window.uiState = Object.freeze({
        setVisible,
        setLoading,
        setEmpty,
        setError
    });
})();
