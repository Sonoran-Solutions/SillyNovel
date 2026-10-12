import { createHostAdapter } from './src/host-adapter.mjs';
import { createShellController, createSourceTracker } from './src/shell.mjs';

function install() {
    const document = globalThis.document;
    const settingsHost = document?.getElementById('extensions_settings');
    if (!settingsHost) {
        console.error('SillyNovel: SillyTavern extensions settings container is unavailable.');
        return;
    }
    if (document.getElementById('sillynovel-settings')) return;

    const getContext = () => globalThis.SillyTavern?.getContext?.();
    const adapter = createHostAdapter(getContext);
    const root = document.createElement('div');
    root.id = 'sillynovel-settings';
    root.className = 'extension_container sillynovel-settings';

    const label = document.createElement('label');
    label.className = 'checkbox_label sillynovel-settings__toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'sillynovel-enabled';
    const labelText = document.createElement('span');
    labelText.textContent = 'Enable SillyNovel placeholder stage';
    label.append(checkbox, labelText);

    const status = document.createElement('p');
    status.className = 'sillynovel-settings__status';
    status.id = 'sillynovel-settings-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    root.append(label, status);
    settingsHost.appendChild(root);
    checkbox.setAttribute('aria-describedby', status.id);

    function setStatus(message) {
        status.textContent = message;
    }

    function saveEnabled(enabled) {
        try {
            const context = getContext();
            const settings = context?.extensionSettings;
            if (!settings || typeof settings !== 'object' || typeof context.saveSettingsDebounced !== 'function') {
                return false;
            }
            const current = settings.sillynovel;
            settings.sillynovel = {
                ...(current && typeof current === 'object' ? current : {}),
                enabled,
            };
            const result = context.saveSettingsDebounced();
            if (result && typeof result.catch === 'function') {
                result.catch(() => setStatus(enabled
                    ? 'SillyNovel is active for this session, but its setting could not be saved.'
                    : 'SillyNovel is off for this session, but its setting could not be saved.'));
            }
            return true;
        } catch {
            return false;
        }
    }

    function readEnabled() {
        try {
            return getContext()?.extensionSettings?.sillynovel?.enabled === true;
        } catch {
            return false;
        }
    }

    function mountStage(initialSource) {
        const chatShell = document.getElementById('sheld');
        const chat = document.getElementById('chat');
        if (!chatShell || !chat || chat.parentElement !== chatShell) {
            throw new Error('SillyTavern chat stage container is unavailable. The original chat was left untouched.');
        }
        if (document.getElementById('sillynovel-stage')) {
            throw new Error('A SillyNovel stage already exists; refusing to replace an unowned element.');
        }

        const stage = document.createElement('section');
        stage.id = 'sillynovel-stage';
        stage.className = 'sillynovel-stage';
        stage.setAttribute('aria-labelledby', 'sillynovel-stage-title');
        const heading = document.createElement('h2');
        heading.id = 'sillynovel-stage-title';
        heading.textContent = 'SillyNovel — M0 placeholder stage';
        const description = document.createElement('p');
        description.className = 'sillynovel-stage__description';
        description.textContent = 'Presentation shell only. The original chat and composer remain available.';
        const sourceStatus = document.createElement('p');
        sourceStatus.className = 'sillynovel-stage__source';
        const observationStatus = document.createElement('p');
        observationStatus.className = 'sillynovel-stage__observation';
        stage.append(heading, description, sourceStatus, observationStatus);
        const sourceTracker = createSourceTracker(initialSource);

        function render(observation) {
            const source = sourceTracker.observe(observation);
            if (source?.index === null || source?.index === undefined) {
                sourceStatus.textContent = 'No current message is available.';
            } else {
                const author = source.author?.label || 'Unknown author';
                sourceStatus.textContent = 'Observed message ' + (source.index + 1) + ' by ' + author + ' (' + source.text.length + ' characters).';
            }
            observationStatus.textContent = 'Last host observation: ' + (observation?.type || 'stageMounted') + '.';
        }

        try {
            chatShell.insertBefore(stage, chat);
            if (!stage.isConnected) throw new Error('SillyNovel stage did not attach to the chat shell.');
            render({ type: 'stageMounted', source: initialSource });
        } catch (error) {
            stage.remove();
            throw error;
        }

        return {
            update: render,
            dispose() {
                stage.remove();
            },
        };
    }

    let controller;
    const view = {
        mountStage,
        reportFailure(error) {
            controller?.disable();
            checkbox.checked = false;
            saveEnabled(false);
            setStatus(error instanceof Error ? error.message : 'SillyNovel stopped safely after an unexpected host error.');
        },
    };
    controller = createShellController(adapter, view);

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            try {
                controller.enable();
                const saved = saveEnabled(true);
                setStatus(saved ? 'SillyNovel placeholder stage is active.' : 'SillyNovel is active for this session; its setting could not be saved.');
            } catch (error) {
                controller.disable();
                checkbox.checked = false;
                saveEnabled(false);
                setStatus(error instanceof Error ? error.message : 'SillyNovel could not start; the original chat remains available.');
            }
            return;
        }

        controller.disable();
        const saved = saveEnabled(false);
        setStatus(saved ? 'SillyNovel is off. Standard chat and the composer are unchanged.' : 'SillyNovel is off for this session; its setting could not be saved.');
    });

    const capabilities = adapter.inspectCapabilities();
    if (!capabilities.ok) {
        checkbox.disabled = true;
        setStatus('Unavailable: missing SillyTavern capability: ' + capabilities.missing.join(', ') + '. Standard chat remains available.');
        return;
    }

    if (readEnabled()) {
        checkbox.checked = true;
        try {
            controller.enable();
            setStatus('SillyNovel placeholder stage is active.');
        } catch (error) {
            checkbox.checked = false;
            saveEnabled(false);
            setStatus(error instanceof Error ? error.message : 'SillyNovel could not start; the original chat remains available.');
        }
    } else {
        setStatus('Off by default. Standard chat and the composer are unchanged.');
    }
}

install();
