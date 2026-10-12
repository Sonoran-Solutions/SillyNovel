import { createReaderSourceModel } from './reader-source-model.mjs';

export function createSourceTracker(initialSource) {
    let currentSource = initialSource ?? null;

    return {
        observe(observation) {
            if (observation && Object.prototype.hasOwnProperty.call(observation, 'source')) {
                currentSource = observation.source ?? null;
            }
            return currentSource;
        },
    };
}

export function createShellController(host, view) {
    let active = false;
    let stage = null;
    let unsubscribe = null;
    const reader = createReaderSourceModel();

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

        const history = host.readHistory?.() ?? [host.readCurrentSource()].filter(Boolean);
        const initialReader = reader.activate(history, host.readChatIdentity?.() ?? history[0]?.identity ?? null);
        const mountedStage = view.mountStage(initialReader.cursor, initialReader);
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
                    stage?.update({ ...observation, reader: reader.apply(observation) });
                } catch (error) {
                    fail(error);
                }
            }, {
                getTrackedIndices: reader.getTrackedIndices,
                getScheduleState: () => {
                    const { sessionEpoch, viewRevision } = reader.getSnapshot();
                    return { sessionEpoch, viewRevision };
                },
            });
            if (typeof unsubscribe !== 'function') throw new Error('SillyTavern event listeners could not be registered.');
        } catch (error) {
            disable();
            throw error;
        }
        return true;
    }

    return { enable, disable, isActive: () => active, getReaderSnapshot: reader.getSnapshot };
}
