/** One quiet director request per completed head; one target waits. See docs/M2_2_DIRECTOR_IMPLEMENTATION.md and docs/M2_3_DIRECTOR_IMPLEMENTATION.md. */
import { checkProposalEvidence, validateProposal } from './director-proposal.mjs';
import { buildDirectorRequest, parseDirectorResponse } from './director-request.mjs';
import { routeProposal } from './director-session.mjs';
import { evidenceStamp } from './transient-scene.mjs';

export const SETTLE_MS = 2000, ABANDON_MS = 90000, HOLD_MS = 5000, DEFAULT_CEILING = 40, FAILURE_LIMIT = 3;
const MANUAL_OK = ' · manual controls remain available', WAITING = '1 reply waiting: Jump to Latest to direct it', TYPING = 'Director waiting while you type';
const NO_COMPOSER = 'The message box was not found, so the director will not wait while you type. ';
export const validCeiling = value => Number.isSafeInteger(value) && value >= 1 && value <= 200;

/**
 * Page-lifetime state. The in-flight slot and the per-project counters outlive a controller,
 * because a chat switch detaches the project: neither may be a free reset (E6, E7).
 * `composer` is the adapter's read-only `inspectComposer`: absent means no signal source at all, `present: false` means the element is missing (F3).
 * @param {{request: Function, inspect: Function, read: Function, write: Function, composer?: Function, setTimer?: Function, clearTimer?: Function}} host
 */
export function createDirectorRuntime({ request, inspect, read, write, composer, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
    const sessions = new Map(), released = new Set(), told = new Set();
    let inFlight = false;
    const wakeAll = () => { for (const wake of released) wake(); };
    const settings = () => { const value = read(); return value && typeof value === 'object' ? value : {}; };
    return {
        inspect, setTimer, clearTimer,
        get inFlight() { return inFlight; },
        composer() { try { return composer?.() ?? null; } catch { return null; } },
        // True once per page for a key, so a missing composer is announced a single time.
        firstTime(key) { return !told.has(key) && Boolean(told.add(key)); },
        composerInput: wakeAll,
        enabled(projectId) { const projects = settings().enabledProjects; return Boolean(projects) && typeof projects === 'object' && Object.hasOwn(projects, projectId) && projects[projectId] === true; },
        setEnabled(projectId, on) {
            const current = settings(), projects = { ...(current.enabledProjects && typeof current.enabledProjects === 'object' ? current.enabledProjects : {}) };
            if (on) projects[projectId] = true; else delete projects[projectId];
            write({ ...current, enabledProjects: projects });
        },
        ceiling() { const value = settings().sessionCeiling; return validCeiling(value) ? value : DEFAULT_CEILING; },
        session(projectId) {
            if (!sessions.has(projectId)) sessions.set(projectId, { count: 0, consecutive: 0, paused: null, ledger: new Set() });
            return sessions.get(projectId);
        },
        endSession(projectId) { sessions.delete(projectId); },
        onRelease(wake) { released.add(wake); return () => released.delete(wake); },
        async send(messages) {
            inFlight = true;
            // generateRawData takes no signal: the slot is released only by settlement.
            try { return await request(messages); } catch { return { ok: false, code: 'TRANSPORT_ERROR' }; } finally { inFlight = false; wakeAll(); }
        },
    };
}

/**
 * Lifetime is one project attachment. Only ever writes through the memory-only journal and overlay.
 * @param {{runtime: object, projectId: string, actions: object, expressions: object, overlay: object, layout: Function, changed: Function}} deps
 */
export function createDirectorController({ runtime, projectId, actions, expressions, overlay, layout, changed }) {
    let disposed = false, pending = null, settleTimer = null, holdTimer = null, composerNote = '', beforeHold = '', firing = false, again = false, ticket = null, abandonTimer = null, notice = '';
    // Attaching or enabling is not a completion: only a later reply can spend the ceiling.
    let seenGeneration = actions.getSnapshot().generation.id;
    const session = () => runtime.session(projectId);
    const say = text => { notice = text; if (!disposed) changed(); };
    // The typing notice must not outlive the hold, nor erase what it replaced (an outstanding request's notice, say).
    const releaseNotice = () => { if (notice === TYPING) say(beforeHold); };
    const clearHold = () => { if (holdTimer !== null) runtime.clearTimer(holdTimer); holdTimer = null; };
    const dropPending = () => { if (settleTimer !== null) runtime.clearTimer(settleTimer); settleTimer = null; clearHold(); pending = null; if (notice === WAITING) say(''); releaseNotice(); };
    const stopWaiting = runtime.onRelease(wake);
    const clearAbandon = () => { if (abandonTimer !== null) runtime.clearTimer(abandonTimer); abandonTimer = null; };
    function failure(code) {
        const state = session();
        state.consecutive++;
        if (state.consecutive >= FAILURE_LIMIT) { state.paused = code; dropPending(); say('Director paused: ' + code + MANUAL_OK); } else say('Director skipped this reply: ' + code + MANUAL_OK);
    }
    function capture(snapshot, history) {
        const { scene, assets, media } = layout(), journal = expressions.get();
        const expressionAssets = journal.assets.filter(asset => asset.kind === 'expression');
        const position = history.findIndex(item => item.sourceKey === snapshot.cursor.sourceKey);
        const stage = overlay.reconcile(expressions.sources(), { selectedSourceKey: snapshot.cursor.sourceKey, assets: [...assets, ...expressionAssets] });
        return { scene, expressionAssets, journal, media, stage, position };
    }
    const proposalToken = (captured, snapshot, token, promptVersion) => {
        const { stage } = captured, context = stage.context;
        return { authority: { ownerKey: context.ownerKey, sessionEpoch: context.sessionEpoch, historyRevision: context.historyRevision, selectionRevision: context.selectionRevision,
            catalogRevision: context.catalog.revision, expectedRevision: stage.revision, source: token.source, origin: 'automatic' },
        expectedOverrideRevision: stage.overrideRevision, evidenceStamp: evidenceStamp(snapshot), selectionRevision: context.selectionRevision,
        historyRevision: context.historyRevision, globalRevision: stage.revision, source: token.source, promptVersion };
    };
    function requestInput(captured, history) {
        const { scene, stage, journal, media, expressionAssets, position } = captured;
        const label = id => journal.media.get(id)?.label ?? media.get(id)?.label ?? id;
        return { window: history.slice(Math.max(0, position - 5), position + 1).map(({ sourceKey, author, text }) => ({ key: sourceKey, author: { kind: author.kind, label: author.label }, text })),
            // What is on stage, including earlier automatic layout: the contract's previous scene.
            cast: stage.view.cast.map(actor => ({ characterKey: actor.key, label: actor.label, present: actor.present, outfitId: actor.outfit?.id ?? null, presenceLocked: actor.locks.presence, outfitLocked: actor.locks.outfit })),
            expressions: expressionAssets.filter(asset => scene.view.cast.some(actor => actor.key === asset.characterKey && (actor.outfit?.id ?? null) === asset.outfitId)).map(asset => ({ expressionId: asset.id, label: label(asset.id), characterKey: asset.characterKey })),
            backgrounds: scene.context.catalog.assets.filter(asset => asset.kind === 'background').map(asset => ({ backgroundId: asset.id, label: label(asset.id), locked: scene.view.backgroundLocked })),
            scene: { backgroundId: stage.view.background?.id ?? null } };
    }
    // E11: at least one present actor with a compatible temporary expression.
    function hasExpressionWork(scene, expressionAssets) {
        return scene.view.cast.some(actor => actor.present && expressionAssets.some(asset => asset.characterKey === actor.key && asset.outfitId === (actor.outfit?.id ?? null)));
    }
    // F3: ms until the composer hold releases, 0 when it does not hold. Reads only the adapter's length and idle signal, never the draft.
    function holdMs() {
        const composer = runtime.composer();
        if (!composer) return 0;
        // Said once per page, on the next request notice: anything said now would be replaced at once.
        if (!composer.present) { if (runtime.firstTime('composer')) composerNote = NO_COMPOSER; return 0; }
        // An idle draft is re-checked every HOLD_MS: the host clears it on Send without an input event.
        if (composer.draft) return HOLD_MS;
        return composer.idleMs === null ? 0 : Math.max(0, HOLD_MS - composer.idleMs);
    }
    // Plan 4.2: the first failing gate decides whether the target waits or is dropped. Returns the ledger key when all hold.
    function gates(target, snapshot) {
        const g = snapshot.generation, state = session();
        if (state.paused || !runtime.enabled(projectId)) return dropPending();
        // F5: before the identity check, because a started generation always has a new id. It then replaces or drops the target.
        if (g.status === 'streaming') { clearHold(); releaseNotice(); return null; }
        // E15: a head superseded during the interval is never requested and spends nothing.
        if (g.id !== target.generationId || g.status !== 'complete' || g.sourceKey !== target.key || g.sourceRevision !== target.revision || snapshot.head?.sourceKey !== target.key) return dropPending();
        const head = snapshot.head, key = JSON.stringify([snapshot.sessionEpoch, snapshot.owner, target.key, head.revision, head.swipeId ?? 0]);
        if (state.ledger.has(key)) return dropPending();
        // Plan 3.2 order: the composer precedes selection and slot. Re-checked on observe, composer input and this timer.
        const hold = holdMs();
        if (hold > 0) { clearHold(); holdTimer = runtime.setTimer(() => { holdTimer = null; wake(); }, hold); if (notice !== TYPING) { beforeHold = notice; say(TYPING); } return null; }
        releaseNotice();
        if (snapshot.cursor?.sourceKey !== target.key) { if (notice !== WAITING) say(WAITING); return null; }
        if (runtime.inFlight) return null;
        const host = runtime.inspect();
        if (!host.ok) { dropPending(); say('Director unavailable: this host has no generation path for it.'); return null; }
        if (host.online === 'no_connection') { dropPending(); say('Director idle: no connection selected'); return null; }
        // After the slot: the last permitted result must still get its chance to apply (E7).
        if (state.count >= runtime.ceiling()) { state.paused = 'CEILING'; dropPending(); say('Director paused: session ceiling ' + runtime.ceiling() + ' reached' + MANUAL_OK); return null; }
        return key;
    }
    // Every entry re-checks from fresh evidence; firing spans settlement, so a waiting target fires only after the result is handled (F6).
    function wake() {
        if (disposed || !pending?.settled) return;
        // A hold timer or composer event during an evaluation is not lost: it re-runs once the evaluation ends.
        if (firing) { again = true; return; }
        const target = pending;
        firing = true;
        fire(target).catch(error => { if (pending === target) dropPending(); if (!disposed) say('Director skipped this reply: ' + error.message); }).finally(() => { firing = false; if (pending !== target || again) { again = false; wake(); } });
    }
    async function fire(target) {
        if (!gates(target, actions.getSceneEvidence(true).snapshot)) return;
        // An unresolved or superseded sync leaves the target for the next observe to re-check.
        if (!await expressions.sync() || disposed || pending !== target) return;
        const { snapshot, history } = actions.getSceneEvidence(false), key = gates(target, snapshot);
        if (!key) return;
        dropPending();
        const state = session();
        const token = expressions.token(), captured = capture(snapshot, history);
        if (!hasExpressionWork(captured.scene, captured.expressionAssets)) return say('Director idle: no expression artwork imported');
        if (!captured.stage || !token.source) return failure('INVALID_SCENE');
        let request;
        try { request = buildDirectorRequest(requestInput(captured, history)); } catch (error) { return failure(error.message); }
        state.ledger.add(key);
        state.count++;
        const current = ticket = { token, proposalToken: proposalToken(captured, snapshot, token, request.promptVersion), stage: captured.stage, window: request.window, texts: request.texts, abandoned: false, anchored: target.key, generationId: target.generationId };
        abandonTimer = runtime.setTimer(() => {
            abandonTimer = null;
            if (ticket !== current) return;
            current.abandoned = true;
            ticket = null;
            session().consecutive++;
            if (session().consecutive >= FAILURE_LIMIT) { session().paused = 'ABANDONED'; dropPending(); }
            say(session().paused === 'ABANDONED' ? 'Director paused: ABANDONED' + MANUAL_OK : 'Director request still outstanding' + MANUAL_OK);
        }, ABANDON_MS);
        say(composerNote + 'Director request in progress' + MANUAL_OK);
        composerNote = '';
        await settle(current, await runtime.send(request.messages));
        // E7: a cap hit pauses at once, after the last permitted result has had its chance to apply.
        if (!disposed && !state.paused && state.count >= runtime.ceiling()) { state.paused = 'CEILING'; dropPending(); say(notice + ' Director paused: session ceiling ' + runtime.ceiling() + ' reached' + MANUAL_OK); }
    }
    // Stale before anything else: E7 does not count a stale result as a failure, whatever it says.
    async function stillCurrent(current) {
        if (!await expressions.valid(current.token)) return null;
        if (disposed || ticket !== current) return null;
        const { snapshot, history } = actions.getSceneEvidence(true);
        if (snapshot.cursor?.sourceKey !== current.anchored) return null;
        const captured = capture(snapshot, history);
        // Identity: any overlay change makes a new scene, and a rebase restarts the scene's own revisions.
        if (!captured.stage || captured.stage !== current.stage) return null;
        const source = expressions.sources().find(item => item.key === current.anchored);
        return checkProposalEvidence(current.proposalToken, snapshot, captured.stage, source).accepted && !session().paused ? captured : null;
    }
    // F4: a reply generation started after capture. Epoch: a chat switch is not a reply. Quiet and impersonate generations produce none.
    function superseded(current) {
        const { sessionEpoch, generation: g } = actions.getSceneEvidence(true).snapshot;
        return sessionEpoch === current.proposalToken.authority.sessionEpoch && g.id !== null && g.id !== current.generationId && g.type !== 'quiet' && g.type !== 'impersonate';
    }
    async function settle(current, result) {
        if (disposed || ticket !== current) return;
        clearAbandon();
        const captured = await stillCurrent(current);
        if (disposed || ticket !== current) return;
        ticket = null;
        if (!captured && superseded(current)) return say('Director request superseded by your reply');
        if (!captured || result.code === 'ABORTED') return say('Director request cancelled.');
        if (!result.ok) return failure(result.code);
        const parsed = parseDirectorResponse(result.text);
        if (!parsed.ok) return failure(parsed.code);
        const valid = validateProposal(parsed.proposal, { scene: captured.stage, texts: current.texts, window: current.window });
        if (!valid.accepted) return failure(valid.code);
        const route = routeProposal(parsed.proposal, captured.stage.view);
        // Applied before the first await, so nothing can change between the identity check and here.
        const layoutResult = overlay.apply(route.layout, current.proposalToken, { texts: current.texts, window: current.window });
        if (!layoutResult.accepted) return failure(layoutResult.code);
        const artLabel = id => captured.media.get(id)?.label ?? id;
        const moved = layoutResult.applied.map(({ index }) => {
            const update = route.layout.updates[index];
            return update.op === 'setLocation' ? 'Director moved the scene to ' + artLabel(update.backgroundId) + '.'
                : 'Director marked ' + captured.scene.view.cast.find(actor => actor.key === update.characterKey).label + (update.present ? ' present.' : ' absent.');
        });
        let applied = 0, kept = layoutResult.ignored.length;
        for (const item of route.expressions) {
            try {
                const outcome = await expressions.dispatch({ type: 'setExpression', characterKey: item.characterKey, assetId: item.assetId, origin: 'automatic', source: current.token.source });
                if (outcome === 'LOCKED') kept++; else applied++;
            } catch (error) {
                if (disposed) return;
                const already = moved.length ? moved.join(' ') + ' Not saved. ' : '';
                return say(already + (error.message.startsWith('Temporary expression limit') ? 'Director skipped this reply: ' + error.message : 'Director request cancelled.'));
            }
        }
        if (disposed) return;
        session().consecutive = 0;
        const changes = applied ? [...moved, 'Director applied ' + applied + (applied === 1 ? ' temporary expression.' : ' temporary expressions.')] : moved;
        const parts = [changes.length ? changes.join(' ') + ' Not saved.' : 'Director: no change.'];
        if (kept) parts.push(kept + ' kept your manual choice.');
        if (route.ignored.length) parts.push(route.ignored.length + (route.ignored.length === 1 ? ' outfit change' : ' outfit changes') + ' not applied: the director does not change outfits.');
        for (const { label } of route.suggestions) parts.push('Suggested location: ' + label);
        say(parts.join(' '));
    }
    return {
        observe() {
            if (disposed) return;
            const snapshot = actions.getSnapshot(), g = snapshot.generation;
            if (g.status === 'complete' && g.id !== seenGeneration) {
                seenGeneration = g.id;
                dropPending();
                if (runtime.enabled(projectId) && g.sourceKey === snapshot.head?.sourceKey) {
                    const target = pending = { generationId: g.id, key: g.sourceKey, revision: g.sourceRevision, settled: false };
                    settleTimer = runtime.setTimer(() => { settleTimer = null; target.settled = true; wake(); }, SETTLE_MS);
                }
            }
            wake();
        },
        setEnabled(on) {
            runtime.setEnabled(projectId, on);
            if (on) { session().paused = null; session().consecutive = 0; seenGeneration = actions.getSnapshot().generation.id; say('Director on for this project. It reacts to the next completed reply.'); return; }
            dropPending(); clearAbandon(); ticket = null; overlay.clear();
            say('Director off for this project.');
        },
        status() { const host = runtime.inspect(), state = session(); return { available: host.ok, enabled: runtime.enabled(projectId), notice, count: state.count, ceiling: runtime.ceiling(), paused: state.paused }; },
        dispose() { disposed = true; stopWaiting(); dropPending(); clearAbandon(); ticket = null; },
    };
}
