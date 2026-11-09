import { createHostAdapter } from './src/host-adapter.mjs';
import { createShellController } from './src/shell.mjs';
import { createMessageFormatter, mountReader } from './src/reader-view.mjs';
import { createDirectorRuntime, DEFAULT_CEILING, validCeiling } from './src/director-controller.mjs';

async function install() {
    const document = globalThis.document;
    const settingsHost = document?.getElementById('extensions_settings');
    if (!settingsHost) {
        console.error('SillyNovel: SillyTavern extensions settings container is unavailable.');
        return;
    }
    if (document.getElementById('sillynovel-settings')) return;

    const getContext = () => globalThis.SillyTavern?.getContext?.();
    let director;
    // The adapter reports composer events; the runtime re-checks any held target. Neither carries the draft.
    const adapter = createHostAdapter(getContext, { onComposerInput: () => director?.composerInput() });
    const root = document.createElement('div');
    root.id = 'sillynovel-settings';
    root.className = 'extension_container sillynovel-settings';

    const label = document.createElement('label');
    label.className = 'checkbox_label sillynovel-settings__toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'sillynovel-enabled';
    const labelText = document.createElement('span');
    labelText.textContent = 'Enable SillyNovel reader';
    label.append(checkbox, labelText);

    const status = document.createElement('p');
    status.className = 'sillynovel-settings__status';
    status.id = 'sillynovel-settings-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const ceilingLabel = document.createElement('label');
    ceilingLabel.className = 'sillynovel-settings__ceiling';
    ceilingLabel.textContent = 'Director requests per project session ';
    const ceiling = document.createElement('input');
    ceiling.type = 'number';
    ceiling.id = 'sillynovel-director-ceiling';
    ceiling.min = '1';
    ceiling.max = '200';
    ceiling.step = '1';
    ceilingLabel.append(ceiling);
    root.append(label, ceilingLabel, status);
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

    function readDirector() {
        try {
            return getContext()?.extensionSettings?.sillynovel?.director ?? null;
        } catch {
            return null;
        }
    }

    // Host settings only (E5): never in the project schema, never carried by bundles.
    function saveDirector(director) {
        const context = getContext();
        const current = context?.extensionSettings?.sillynovel;
        context.extensionSettings.sillynovel = { ...(current && typeof current === 'object' ? current : {}), director };
        context.saveSettingsDebounced();
    }

    director = createDirectorRuntime({ request: adapter.requestDirectorText, inspect: adapter.inspectDirector, composer: adapter.inspectComposer, read: readDirector, write: saveDirector });
    const showCeiling = () => { ceiling.value = String(director.ceiling()); };
    showCeiling();
    ceiling.addEventListener('change', () => {
        const value = Number(ceiling.value);
        if (validCeiling(value)) saveDirector({ ...(readDirector() ?? {}), sessionCeiling: value });
        else setStatus('Use a whole number from 1 to 200. The default is ' + DEFAULT_CEILING + '.');
        showCeiling();
    });

    let controller;
    const view = {
        mountStage(_source, snapshot) {
            return mountReader({ document, snapshot, formatMessage, actions: {
                navigate: controller.navigate,
                jumpToLatest: controller.jumpToLatest,
                openOriginal: controller.openOriginal,
                setTextScrollMode: controller.setTextScrollMode,
                getSnapshot: controller.getReaderSnapshot,
                getRequestHeaders: () => getContext().getRequestHeaders(),
                getSceneEvidence: controller.getSceneEvidence,
                director,
                image: adapter.image,
                fail: view.reportFailure,
            } });
        },
        reportFailure(error) {
            controller?.disable();
            checkbox.checked = false;
            saveEnabled(false);
            setStatus(error instanceof Error ? error.message : 'SillyNovel stopped safely after an unexpected host error.');
        },
    };
    let formatMessage;
    checkbox.disabled = true;
    try {
        // The pinned host exposes these installed libraries; no formatter hooks or canonical writes.
        formatMessage = createMessageFormatter(await import('/lib.js'), document);
    } catch {
        setStatus('Message formatting is unavailable. Standard chat remains available; reload to retry.');
        return;
    }
    checkbox.disabled = false;
    controller = createShellController(adapter, view);

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            try {
                controller.enable();
                const saved = saveEnabled(true);
                setStatus(saved ? 'SillyNovel reader is active.' : 'SillyNovel is active for this session; its setting could not be saved.');
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
            setStatus('SillyNovel reader is active.');
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
