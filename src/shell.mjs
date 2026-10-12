export function createShellController(host, view) {
    let active = false;
    let stage = null;
    let unsubscribe = null;

    function disable() {
        const wasActive = active || stage !== null || unsubscribe !== null;
        active = false;
        const currentStage = stage;
        const currentUnsubscribe = unsubscribe;
        stage = null;
        unsubscribe = null;
        try { currentUnsubscribe?.(); } catch (error) { view.reportFailure?.(error); }
        try { currentStage?.dispose(); } catch (error) { view.reportFailure?.(error); }
        return wasActive;
    }

    function fail(error) {
        disable();
        view.reportFailure?.(error);
    }

    function enable() {
        if (active) return false;
        const capabilities = host.inspectCapabilities();
        if (!capabilities.ok) {
            throw new Error('Missing SillyTavern capabilities: ' + capabilities.missing.join(', ') + '. The original chat remains available.');
        }

        const mountedStage = view.mountStage(host.readCurrentSource());
        if (!mountedStage || typeof mountedStage.update !== 'function' || typeof mountedStage.dispose !== 'function') {
            try { mountedStage?.dispose?.(); } catch { /* cleanup after invalid mount */ }
            throw new Error('SillyNovel could not mount its placeholder stage. The original chat remains available.');
        }

        stage = mountedStage;
        active = true;
        try {
            unsubscribe = host.subscribe((observation) => {
                if (!active) return;
                try {
                    stage?.update(observation);
                } catch (error) {
                    fail(error);
                }
            });
            if (typeof unsubscribe !== 'function') throw new Error('SillyTavern event listeners could not be registered.');
        } catch (error) {
            disable();
            throw error;
        }
        return true;
    }

    return { enable, disable, isActive: () => active };
}
