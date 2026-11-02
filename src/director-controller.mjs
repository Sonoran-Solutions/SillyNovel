/** One quiet director request per completed head. See docs/M2_2_DIRECTOR_IMPLEMENTATION.md. */
import { checkProposalEvidence, validateProposal } from './director-proposal.mjs';
import { buildDirectorRequest, parseDirectorResponse } from './director-request.mjs';
import { mirrorScene, routeProposal } from './director-session.mjs';
import { evidenceStamp } from './transient-scene.mjs';

export const SETTLE_MS = 2000, ABANDON_MS = 90000, DEFAULT_CEILING = 40, FAILURE_LIMIT = 3;
const MANUAL_OK = ' · manual controls remain available';
export const validCeiling = value => Number.isSafeInteger(value) && value >= 1 && value <= 200;

/**
 * Page-lifetime state. The in-flight slot and the per-project counters outlive a controller,
 * because a chat switch detaches the project: neither may be a free reset (E6, E7).
 * @param {{request: Function, inspect: Function, read: Function, write: Function, setTimer?: Function, clearTimer?: Function}} host
 */
export function createDirectorRuntime({ request, inspect, read, write, setTimer = setTimeout, clearTimer = clearTimeout }) {
    const sessions = new Map();
    let inFlight = false;
    const settings = () => { const value = read(); return value && typeof value === 'object' ? value : {}; };
    return {
        inspect, setTimer, clearTimer,
        get inFlight() { return inFlight; },
        enabled(projectId) { const projects = settings().enabledProjects; return Boolean(projects) && typeof projects === 'object' && Object.hasOwn(projects, projectId) && projects[projectId] === true; },
        setEnabled(projectId, on) {
            const current = settings(), projects = { ...(current.enabledProjects && typeof current.enabledProjects === 'object' ? current.enabledProjects : {}) };
            if (on) projects[projectId] = true; else delete projects[projectId];
            write({ ...current, enabledProjects: projects });
        },
        ceiling() { const value = settings().sessionCeiling; return validCeiling(value) ? value : DEFAULT_CEILING; },
        session(projectId) {
            if (!sessions.has(projectId)) sessions.set(projectId, { count: 0, consecutive: 0, paused: null, skipped: 0, ledger: new Set() });
            return sessions.get(projectId);
        },
        endSession(projectId) { sessions.delete(projectId); },
        async send(messages) {
            inFlight = true;
            // generateRawData takes no signal: the slot is released only by settlement.
            try { return await request(messages); } catch { return { ok: false, code: 'TRANSPORT_ERROR' }; } finally { inFlight = false; }
        },
    };
}

/**
 * Lifetime is one project attachment. Only ever writes through the memory-only journal.
 * @param {{runtime: object, projectId: string, actions: object, expressions: object, layout: Function, changed: Function}} deps
 */
export function createDirectorController({ runtime, projectId, actions, expressions, layout, changed }) {
    let disposed = false, armed = null, settleTimer = null, ticket = null, abandonTimer = null, notice = '';
    // Attaching or enabling is not a completion: only a later reply can spend the ceiling.
    let seenGeneration = actions.getSnapshot().generation.id;
    const session = () => runtime.session(projectId);
    const say = text => { notice = text; if (!disposed) changed(); };
    const clearSettle = () => { if (settleTimer !== null) runtime.clearTimer(settleTimer); settleTimer = null; armed = null; };
    const clearAbandon = () => { if (abandonTimer !== null) runtime.clearTimer(abandonTimer); abandonTimer = null; };
    function failure(code) {
        const state = session();
        state.consecutive++;
        if (state.consecutive >= FAILURE_LIMIT) { state.paused = code; say('Director paused: ' + code + MANUAL_OK); } else say('Director skipped this reply: ' + code + MANUAL_OK);
    }
    function capture(snapshot, history, token) {
        const { scene, actors, assets, media } = layout(), journal = expressions.get();
        const expressionAssets = journal.assets.filter(asset => asset.kind === 'expression');
        const position = history.findIndex(item => item.sourceKey === snapshot.cursor.sourceKey);
        const mirror = mirrorScene({ ownerKey: 'director:' + projectId, sessionEpoch: snapshot.sessionEpoch, historyRevision: token.historyRevision, selectionRevision: token.selectionRevision,
            catalogRevision: scene.context.catalog.revision, selectedSourceKey: snapshot.cursor.sourceKey, sources: expressions.sources(), actors, assets: [...assets, ...expressionAssets], view: scene.view });
        return { scene, expressionAssets, journal, media, mirror, position };
    }
    const proposalToken = (captured, snapshot, token, promptVersion) => {
        const { mirror } = captured, context = mirror.context;
        return { authority: { ownerKey: context.ownerKey, sessionEpoch: context.sessionEpoch, historyRevision: context.historyRevision, selectionRevision: context.selectionRevision,
            catalogRevision: context.catalog.revision, expectedRevision: mirror.revision, source: token.source, origin: 'automatic' },
        expectedOverrideRevision: mirror.overrideRevision, evidenceStamp: evidenceStamp(snapshot), selectionRevision: context.selectionRevision,
        historyRevision: context.historyRevision, globalRevision: mirror.revision, source: token.source, promptVersion };
    };
    function requestInput(captured, history) {
        const { scene, journal, media, expressionAssets, position } = captured;
        const label = id => journal.media.get(id)?.label ?? media.get(id)?.label ?? id;
        return { window: history.slice(Math.max(0, position - 5), position + 1).map(({ sourceKey, author, text }) => ({ key: sourceKey, author: { kind: author.kind, label: author.label }, text })),
            cast: scene.view.cast.map(actor => ({ characterKey: actor.key, label: actor.label, present: actor.present, outfitId: actor.outfit?.id ?? null, presenceLocked: actor.locks.presence, outfitLocked: actor.locks.outfit })),
            expressions: expressionAssets.filter(asset => scene.view.cast.some(actor => actor.key === asset.characterKey && (actor.outfit?.id ?? null) === asset.outfitId)).map(asset => ({ expressionId: asset.id, label: label(asset.id), characterKey: asset.characterKey })),
            backgrounds: scene.context.catalog.assets.filter(asset => asset.kind === 'background').map(asset => ({ backgroundId: asset.id, label: label(asset.id), locked: scene.view.backgroundLocked })),
            scene: { backgroundId: scene.view.background?.id ?? null } };
    }
    // E11: at least one present actor with a compatible temporary expression.
    function hasExpressionWork(scene, expressionAssets) {
        return scene.view.cast.some(actor => actor.present && expressionAssets.some(asset => asset.characterKey === actor.key && asset.outfitId === (actor.outfit?.id ?? null)));
    }
    async function fire(target) {
        if (disposed || !runtime.enabled(projectId)) return;
        const fresh = actions.getSceneEvidence(true), g = fresh.snapshot.generation;
        // E15: a head superseded during the interval is never requested and spends nothing.
        if (g.id !== target.generationId || g.status !== 'complete' || g.sourceKey !== target.key || g.sourceRevision !== target.revision || fresh.snapshot.head?.sourceKey !== target.key) return;
        const state = session();
        if (state.paused) return;
        const host = runtime.inspect();
        if (!host.ok) return say('Director unavailable: this host has no generation path for it.');
        if (host.online === 'no_connection') return say('Director idle: no connection selected');
        const head = fresh.snapshot.head;
        const key = JSON.stringify([fresh.snapshot.sessionEpoch, fresh.snapshot.owner, target.key, head.revision, head.swipeId ?? 0]);
        if (state.ledger.has(key)) return;
        if (fresh.snapshot.cursor?.sourceKey !== target.key) { state.skipped++; return say(state.skipped + (state.skipped === 1 ? ' reply' : ' replies') + ' not directed while reading earlier messages'); }
        if (runtime.inFlight) { state.skipped++; return say(state.skipped + (state.skipped === 1 ? ' reply' : ' replies') + ' not directed while a request is outstanding'); }
        if (state.count >= runtime.ceiling()) { state.paused = 'CEILING'; return say('Director paused: session ceiling ' + runtime.ceiling() + ' reached' + MANUAL_OK); }
        if (!await expressions.sync()) return;
        const { snapshot, history } = actions.getSceneEvidence(false);
        if (disposed || runtime.inFlight || snapshot.generation.id !== target.generationId || snapshot.cursor?.sourceKey !== target.key) return;
        const token = expressions.token(), captured = capture(snapshot, history, token);
        if (!hasExpressionWork(captured.scene, captured.expressionAssets)) return say('Director idle: no expression artwork imported');
        if (!captured.mirror || !token.source) return failure('INVALID_SCENE');
        let request;
        try { request = buildDirectorRequest(requestInput(captured, history)); } catch (error) { return failure(error.message); }
        state.ledger.add(key);
        state.count++;
        const current = ticket = { token, proposalToken: proposalToken(captured, snapshot, token, request.promptVersion), mirror: captured.mirror, window: request.window, texts: request.texts, abandoned: false, anchored: target.key };
        abandonTimer = runtime.setTimer(() => {
            abandonTimer = null;
            if (ticket !== current) return;
            current.abandoned = true;
            ticket = null;
            session().consecutive++;
            if (session().consecutive >= FAILURE_LIMIT) session().paused = 'ABANDONED';
            say(session().paused === 'ABANDONED' ? 'Director paused: ABANDONED' + MANUAL_OK : 'Director request still outstanding' + MANUAL_OK);
        }, ABANDON_MS);
        say('Director request in progress' + MANUAL_OK);
        await settle(current, await runtime.send(request.messages));
    }
    // Stale before anything else: E7 does not count a stale result as a failure, whatever it says.
    async function stillCurrent(current) {
        if (!await expressions.valid(current.token)) return null;
        if (disposed || ticket !== current) return null;
        const { snapshot, history } = actions.getSceneEvidence(true);
        if (snapshot.cursor?.sourceKey !== current.anchored) return null;
        const captured = capture(snapshot, history, current.token);
        if (!captured.mirror || JSON.stringify([captured.mirror.context, captured.mirror.view]) !== JSON.stringify([current.mirror.context, current.mirror.view])) return null;
        const source = expressions.sources().find(item => item.key === current.anchored);
        return checkProposalEvidence(current.proposalToken, snapshot, captured.mirror, source).accepted && !session().paused ? captured : null;
    }
    async function settle(current, result) {
        if (disposed || ticket !== current) return;
        clearAbandon();
        const captured = await stillCurrent(current);
        if (disposed || ticket !== current) return;
        ticket = null;
        if (!captured || result.code === 'ABORTED') return say('Director request cancelled.');
        if (!result.ok) return failure(result.code);
        const parsed = parseDirectorResponse(result.text);
        if (!parsed.ok) return failure(parsed.code);
        const valid = validateProposal(parsed.proposal, { scene: captured.mirror, texts: current.texts, window: current.window });
        if (!valid.accepted) return failure(valid.code);
        const route = routeProposal(parsed.proposal, captured.mirror.view);
        let applied = 0, kept = 0;
        for (const item of route.expressions) {
            try {
                const outcome = await expressions.dispatch({ type: 'setExpression', characterKey: item.characterKey, assetId: item.assetId, origin: 'automatic', source: current.token.source });
                if (outcome === 'LOCKED') kept++; else applied++;
            } catch (error) {
                if (disposed) return;
                return say(error.message.startsWith('Temporary expression limit') ? 'Director skipped this reply: ' + error.message : 'Director request cancelled.');
            }
        }
        if (disposed) return;
        session().consecutive = 0;
        const parts = [applied ? 'Director applied ' + applied + (applied === 1 ? ' temporary expression' : ' temporary expressions') + '. Not saved.' : 'Director: no change.'];
        if (kept) parts.push(kept + ' kept your manual choice.');
        if (route.ignored.length) parts.push(route.ignored.length + (route.ignored.length === 1 ? ' layout change' : ' layout changes') + ' not applied: automatic layout is not available in attached projects yet.');
        for (const { label } of route.suggestions) parts.push('Suggested location: ' + label);
        say(parts.join(' '));
    }
    return {
        observe() {
            if (disposed) return;
            const snapshot = actions.getSnapshot(), g = snapshot.generation;
            if (armed && armed.generationId !== g.id) clearSettle();
            if (g.status !== 'complete' || g.id === seenGeneration) return;
            seenGeneration = g.id;
            if (!runtime.enabled(projectId) || g.sourceKey !== snapshot.head?.sourceKey) return;
            clearSettle();
            const target = armed = { generationId: g.id, key: g.sourceKey, revision: g.sourceRevision };
            settleTimer = runtime.setTimer(() => { settleTimer = null; armed = null; fire(target).catch(error => { if (!disposed) say('Director skipped this reply: ' + error.message); }); }, SETTLE_MS);
        },
        setEnabled(on) {
            runtime.setEnabled(projectId, on);
            if (on) { session().paused = null; session().consecutive = 0; seenGeneration = actions.getSnapshot().generation.id; say('Director on for this project. It reacts to the next completed reply.'); return; }
            clearSettle(); clearAbandon(); ticket = null;
            say('Director off for this project.');
        },
        status() { const host = runtime.inspect(), state = session(); return { available: host.ok, enabled: runtime.enabled(projectId), notice, count: state.count, ceiling: runtime.ceiling(), paused: state.paused }; },
        dispose() { disposed = true; clearSettle(); clearAbandon(); ticket = null; },
    };
}
