// DYL-193 replay rows on the disposable pinned host. Synthetic data and the loopback endpoint only.
// node tests/probes/dyl193/host.mjs <pinned-host-root> <row>     row: scaling | motion | assistive | groups
// scaling, motion and assistive are SYNTHETIC desktop emulations (Playwright/CDP); they never stand for a
// physical device, a system preference or a screen reader. groups is a real host flow through the host's own
// message controls (Create branch, Create checkpoint, Open checkpoint chat, Manage chat files).
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHarness, PIN, repo } from '../m2-director/harness.mjs';

const row = process.argv[3];
assert.ok(['scaling', 'motion', 'assistive', 'groups'].includes(row), 'row: scaling | motion | assistive | groups');
const h = await createHarness(resolve(process.argv[2]), 'dyl193-' + row);
const { page, native, plugin, control, inventory, connect, root } = h;
const evidence = { row, synthetic: row !== 'groups', candidate: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), host: PIN, node: process.version, checks: [], problems: [], screenshots: [],
    notTested: ['Physical tablet (no device attached)', 'Real screen reader', 'System-level reduced-motion or font-size settings', 'Real browser zoom control (emulated only)', 'Touch digitizer and soft keyboard', 'Native confirm() dialog geometry'] };
const pass = name => { evidence.checks.push(name); console.log('PASS ' + name); };
const art = name => readFile(join(repo, 'tests/fixtures/m12-stage', name));
const field = name => page.locator('#sillynovel-stage').getByLabel(name, { exact: true });
const button = name => page.getByRole('button', { name, exact: true });
const stage = () => page.locator('#sillynovel-stage');
const until = async (check, message, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await check()) return; await delay(50); } throw Error('Timed out: ' + message); };
const idle = () => page.waitForFunction(() => getComputedStyle(document.querySelector('#mes_stop')).display === 'none' && !document.querySelector('#send_but').classList.contains('displayNone') && !SillyTavern.getContext().chat.at(-1)?.is_user);
const openControls = (open = true) => page.locator('.sillynovel-controls').evaluate((e, open) => { e.open = open; }, open);
const shot = async (name, options = {}) => { const file = name + '.png'; await stage().screenshot({ path: join(root, file), scale: 'css', ...options }); evidence.screenshots.push(file); };
const message = (name, mes, is_user = false) => ({ name, mes, is_user, is_system: false, send_date: '2026-11-02T12:00:00.000Z', extra: {} });
const scenario = JSON.parse(await readFile(join(repo, 'tests/fixtures/dyl60-owner-conversation.json')));

async function makeProject(name, actors, sprites, extraBackground = false) {
    const project = await plugin('/projects', 'POST', { name }, 201);
    const catalog = [], assets = [];
    for (const file of sprites) assets.push((await plugin('/projects/' + project.projectId + '/assets', 'POST', await art(file), 201, 'image/png')).assetId);
    const list = actors.map(([label, slot], i) => { const actorId = randomUUID(), spriteAssetId = assets[i]; catalog.push({ assetId: spriteAssetId, kind: 'sprite', actorId, label: label + ' base' }); return { actorId, name: label, present: true, slot, spriteAssetId, locks: { presence: true, outfit: true, slot: true } }; });
    const forest = (await plugin('/projects/' + project.projectId + '/assets', 'POST', await art('forest.png'), 201, 'image/png')).assetId;
    catalog.push({ assetId: forest, kind: 'background', actorId: null, label: 'Forest' });
    // A stored PNG that neither the scene nor the library references is what "Review unused artwork" lists.
    if (extraBackground) await plugin('/projects/' + project.projectId + '/assets', 'POST', await art('tavern.png'), 201, 'image/png');
    return plugin('/projects/' + project.projectId, 'PUT', { schemaVersion: 2, expectedRevision: 0, name, scene: { backgroundAssetId: forest, backgroundLocked: true, actors: list }, catalog });
}
async function enableExtension() {
    const drawer = page.locator('.drawer-icon[title="Extensions"]');
    await drawer.click();
    await page.locator('#sillynovel-enabled').setChecked(true);
    await drawer.click();
    await stage().waitFor();
}
async function selectCard(name) {
    const icon = page.locator('#rightNavDrawerIcon');
    if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
    await page.locator('#right-nav-panel.openDrawer').waitFor({ state: 'visible' });
    if (!await page.locator('#rm_button_create').isVisible()) await page.locator('#rm_button_characters').click();
    await page.locator('#rm_print_characters_block').getByText(name, { exact: true }).first().click();
    await page.waitForFunction(n => SillyTavern.getContext().chat[0]?.name === n, name);
    await icon.click();
    await page.locator('#right-nav-panel').waitFor({ state: 'hidden' });
}
async function openProject(projectId, sprites) {
    await openControls();
    await field('Saved project').selectOption(projectId);
    await button('Open project and use with this chat').click();
    await page.waitForFunction(n => document.querySelectorAll('.sillynovel-sprite:not([hidden])').length === n, sprites);
    await page.waitForFunction(() => [...document.querySelectorAll('.sillynovel-art img')].filter(e => !e.hidden).every(e => e.complete && e.naturalWidth));
}
async function importArt(actorId) {
    await field('Project actor').selectOption(actorId);
    await page.waitForFunction(() => !document.querySelector('[aria-label="Temporary expression PNG"]').disabled);
    await field('Temporary expression label').fill('Happy');
    await field('Temporary expression PNG').setInputFiles(join(repo, 'tests/fixtures/m12-stage/mira-a-joy.png'));
    await page.waitForFunction(() => document.querySelector('.sillynovel-expression-context').textContent.includes('Temporary expression ready'));
}
// Individual chat with an attached project, the director on, and one accepted decision so "Why this visual?" exists.
async function prepareIndividual() {
    await page.goto(h.origin);
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await native('/api/characters/create', { ch_name: 'Project A', description: 'Public synthetic fixture', first_mes: 'Welcome to Project A' });
    const story = [{ user_name: 'Synthetic Traveller', character_name: 'Project A', create_date: '2026-11-02T12:00:00.000Z', chat_metadata: {} }, message('Project A', 'The lantern is waiting. Public synthetic fixture.')];
    for (const turn of scenario.individual.slice(0, 6)) story.push(message('Synthetic Traveller', turn.user, true), message(turn.speaker, turn.reply));
    await native('/api/chats/save', { avatar_url: 'Project A.png', file_name: 'The Last Lantern', chat: story });
    const solo = await makeProject('Replay solo', [['Mira', 'left'], ['Rowan', 'right']], ['mira-a.png', 'rowan.png'], true);
    await page.reload();
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().characters.length > 0);
    await selectCard('Project A');
    await page.evaluate(async () => { const s = await import('/script.js'); await s.openCharacterChat('The Last Lantern'); await s.saveSettings(); });
    await connect();
    await enableExtension();
    await openProject(solo.projectId, 2);
    await page.locator('.sillynovel-director input').setChecked(true);
    await importArt(solo.scene.actors[0].actorId);
    await control({ reset: true, fallback: { auto: { excerpt: 'lantern glows' } } });
    const before = await page.evaluate(() => SillyTavern.getContext().chat.length);
    await page.locator('#send_textarea').fill('A synthetic turn so the director decides something.');
    await page.locator('#send_but').click();
    await page.waitForFunction(n => SillyTavern.getContext().chat.length >= n + 2, before);
    await idle();
    await until(async () => /applied 1 temporary expression/.test(await page.locator('.sillynovel-director-status').textContent()), 'director decision applied', 30000);
    await page.locator('.sillynovel-why').waitFor({ state: 'visible' });
    return solo;
}
async function openWhy() {
    if (await page.locator('.sillynovel-why').getAttribute('open') !== null) return;
    await page.locator('.sillynovel-why summary').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.sillynovel-why__body').textContent.includes('Session summary'));
}
async function openCleanup() {
    await openControls();
    if (await page.locator('.sillynovel-cleanup-list input').count()) return;
    await button('Review unused artwork').click();
    await page.waitForFunction(() => document.querySelectorAll('.sillynovel-cleanup-list input').length >= 1);
}
const measure = locator => locator.evaluate(e => { const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2))); const ok = hit === e || e.contains(hit) || (hit && hit.contains(e)); return { box: [b.left, b.top, b.width, b.height].map(Math.round), inViewport: b.left >= -1 && b.top >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1, hit: ok, coveredBy: ok || !hit ? undefined : hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (hit.className ? '.' + String(hit.className).split(' ').join('.') : '') + ' "' + hit.textContent.trim().slice(0, 30) + '" at ' + JSON.stringify([hit.getBoundingClientRect().top, hit.getBoundingClientRect().bottom].map(Math.round)) + (hit.closest('#sillynovel-stage') ? ' (stage)' : ' (host)'), label: e.getAttribute('aria-label') || e.textContent.trim().slice(0, 40) }; });
const reach = async (locator, what) => {
    await locator.scrollIntoViewIfNeeded();
    let r = await measure(locator);
    // A minimal scroll can park a row under the panel's sticky summary; a user scrolls on. Retry centered and keep the observation.
    if (!(r.inViewport && r.hit) && /summary/.test(r.coveredBy || '')) { const first = r; await locator.evaluate(e => e.scrollIntoView({ block: 'center' })); r = { ...await measure(locator), afterMinimalScroll: first }; }
    return { what, ...r, ok: r.inViewport && r.hit };
};
// One geometry audit; it collects problems instead of throwing so every variant leaves evidence.
async function audit(name) {
    const problems = [];
    // scrollWidth is reported in the zoomed element's own units under CSS zoom, so horizontal overflow is measured by trying to scroll.
    const metrics = await page.evaluate(() => { const x = scrollX; scrollTo(1e6, scrollY); const scrollsHorizontally = scrollX > 0; scrollTo(x, scrollY); return { innerWidth, innerHeight, dpr: devicePixelRatio, visualScale: visualViewport.scale, rootZoom: document.documentElement.style.zoom || '', rootFontSize: getComputedStyle(document.documentElement).fontSize, hostFontScale: getComputedStyle(document.documentElement).getPropertyValue('--fontScale').trim(), documentScrollWidth: document.documentElement.scrollWidth, scrollsHorizontally, dialogueFontSize: getComputedStyle(document.querySelector('.sillynovel-dialogue')).fontSize, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }; });
    if (metrics.scrollsHorizontally) {
        const overflowing = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).visibility !== 'hidden').map(e => ({ path: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''), right: Math.round(e.getBoundingClientRect().right), stage: Boolean(e.closest('#sillynovel-stage')) })).sort((a, b) => b.right - a.right).slice(0, 12));
        metrics.overflowing = overflowing;
        // Host elements sized in viewport units cannot follow a root CSS zoom; only the extension's own overflow counts against the candidate.
        if (overflowing.some(o => o.stage)) problems.push('stage content scrolls the document horizontally: ' + JSON.stringify(overflowing.filter(o => o.stage)));
        else metrics.hostOverflowOnly = true;
    }
    await openControls(false);
    const dialogue = await page.locator('.sillynovel-dialogue').evaluate(e => { const b = e.getBoundingClientRect(); return { height: Math.round(b.height), text: e.textContent.trim().length, fitsHorizontally: e.scrollWidth <= e.clientWidth + 1, scrollable: e.scrollHeight > e.clientHeight + 1 }; });
    if (!(dialogue.height > 60 && dialogue.text > 0 && dialogue.fitsHorizontally)) problems.push('reader not readable: ' + JSON.stringify(dialogue));
    const reached = [];
    for (const name of ['Previous', 'Next', 'Backlog', 'Jump to Latest', 'Copy message']) { const r = await reach(button(name), 'button ' + name); reached.push(r); if (!r.ok) problems.push('unreachable: ' + JSON.stringify(r)); }
    await openControls(true);
    const controls = page.locator('.sillynovel-controls__panel').locator('button:visible, select:visible, input:visible');
    const count = await controls.count();
    let short = [];
    for (let i = 0; i < count; i++) {
        const c = controls.nth(i);
        const r = await reach(c, 'control');
        if (!r.ok) problems.push('unreachable: ' + JSON.stringify(r));
        const tag = await c.evaluate(e => e.tagName + ':' + (e.type || ''));
        if (/^(BUTTON|SELECT)/.test(tag) && r.box[3] < 44) short.push({ label: r.label, height: r.box[3] });
    }
    await openWhy();
    const why = await page.locator('.sillynovel-why').evaluate(e => { const s = document.querySelector('#sillynovel-stage').getBoundingClientRect(), b = e.getBoundingClientRect(); return { open: e.open, height: Math.round(b.height), insideStage: b.left >= s.left - 1 && b.right <= s.right + 1 && b.top >= s.top - 1 && b.bottom <= s.bottom + 1, bodyScrollable: e.scrollHeight > e.clientHeight + 1, text: e.textContent.trim().length }; });
    if (!(why.open && why.insideStage && why.text > 0)) problems.push('disclosure: ' + JSON.stringify(why));
    const reply = await reach(page.locator('#send_textarea'), 'reply field with disclosure open');
    const focusable = await page.locator('#send_textarea').evaluate(e => { e.focus(); return document.activeElement === e; });
    if (!(reply.ok && focusable)) problems.push('reply field: ' + JSON.stringify({ ...reply, focusable }));
    await openCleanup();
    const items = page.locator('.sillynovel-cleanup-item');
    const cleanup = [];
    for (let i = 0; i < await items.count(); i++) { const r = await reach(items.nth(i).locator('input'), 'cleanup checkbox'); const fits = await items.nth(i).evaluate(e => { const p = e.closest('.sillynovel-controls__panel').getBoundingClientRect(), b = e.getBoundingClientRect(); return b.right <= p.right + 1 && b.left >= p.left - 1; }); cleanup.push({ ...r, fits }); if (!(r.ok && fits && r.box[2] >= 44 && r.box[3] >= 44)) problems.push('cleanup item: ' + JSON.stringify({ ...r, fits })); }
    const clipped = await page.evaluate(() => [...document.querySelectorAll('#sillynovel-stage, #sillynovel-stage *')].filter(e => !e.closest('.sillynovel-art') && !e.hidden).map(e => { const s = getComputedStyle(e); return { path: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''), ox: s.overflowX, oy: s.overflowY, sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }; }).filter(x => (['hidden', 'clip'].includes(x.ox) && x.sw > x.cw + 1) || (['hidden', 'clip'].includes(x.oy) && x.sh > x.ch + 1)));
    if (clipped.length) problems.push('clipped content: ' + JSON.stringify(clipped));
    await shot(row + '-' + name + '-why-open');
    await openControls(false);
    await shot(row + '-' + name + '-reader');
    const report = { name, metrics, dialogue, navigation: reached, controlsAudited: count, controlsShorterThan44: short, why, reply: { ...reply, focusable }, cleanup, clippedOutsideArt: clipped, problems };
    for (const p of problems) evidence.problems.push(name + ': ' + p);
    return report;
}

try {
    evidence.browser = page.context().browser().version();
    if (row === 'scaling') {
        await prepareIndividual();
        const cdp = await page.context().newCDPSession(page);
        const set = (width, height, deviceScaleFactor) => cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false });
        evidence.variants = [];
        evidence.variants.push(await audit('baseline-1440x1100-dpr1'));
        // 200 % browser zoom of a 1440x1100 window: the layout viewport halves in CSS px and the DPR doubles; media queries see 720 px.
        await set(720, 550, 2); await delay(500);
        evidence.variants.push(await audit('zoom200-viewport-720x550-dpr2'));
        await set(1440, 1100, 2); await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await delay(500);
        evidence.variants.push(await audit('zoom200-css-zoom-dpr2'));
        await page.evaluate(() => { document.documentElement.style.zoom = ''; }); await set(1440, 1100, 1);
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await delay(500);
        evidence.variants.push(await audit('root-font-size-200'));
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; document.documentElement.style.setProperty('--fontScale', '2'); }); await delay(500);
        evidence.variants.push(await audit('host-font-scale-2'));
        await page.evaluate(() => { document.documentElement.style.removeProperty('--fontScale'); });
        await cdp.send('Emulation.clearDeviceMetricsOverride');
        for (const v of evidence.variants) assert.deepEqual(v.problems, [], v.name);
        pass('SYNTHETIC scaling: reader readable, navigation and ' + evidence.variants[1].controlsAudited + ' controls reachable, reply field reachable and focusable with the disclosure open, cleanup list unclipped, no clipped stage content at baseline, 200 % viewport zoom (DPR 2), CSS zoom 2 (DPR 2), root font 200 % and host font scale 2');
    }
    if (row === 'motion') {
        await prepareIndividual();
        await openControls(true);
        await openWhy();
        const snapshot = () => page.evaluate(() => {
            const nodes = [...document.querySelectorAll('#sillynovel-stage, #sillynovel-stage *')];
            const path = e => { const parts = []; for (let n = e; n && n.id !== 'sillynovel-stage'; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(' ')[0] : '') + ':' + [...n.parentElement.children].indexOf(n)); return parts.join('/') || '#sillynovel-stage'; };
            const motion = nodes.map(e => { const s = getComputedStyle(e); return { path: path(e), animationName: s.animationName, animationDuration: s.animationDuration, transitionProperty: s.transitionProperty, transitionDuration: s.transitionDuration }; });
            const text = document.querySelector('#sillynovel-stage').innerText.replace(/\d+(\.\d+)? s\b/g, 'N s');
            const boxes = Object.fromEntries(['.sillynovel-dialogue', '.sillynovel-controls summary', '.sillynovel-why', '.sillynovel-art', '#send_textarea'].map(sel => { const b = document.querySelector(sel).getBoundingClientRect(); return [sel, [b.left, b.top, b.width, b.height].map(Math.round)]; }));
            return { reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, count: nodes.length, motion, text, boxes };
        });
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await delay(300);
        const normal = await snapshot();
        await shot('motion-no-preference');
        await page.emulateMedia({ reducedMotion: 'reduce' }); await delay(300);
        const reduced = await snapshot();
        await shot('motion-reduce');
        assert.equal(normal.reduce, false); assert.equal(reduced.reduce, true);
        // The initial value of transition-property is "all" with a 0 s duration, which is no transition; only a non-zero duration or a named animation moves.
        const moves = m => m.animationName !== 'none' || m.transitionDuration.split(',').some(d => parseFloat(d) > 0);
        const moving = reduced.motion.filter(moves);
        const normallyMoving = normal.motion.filter(moves);
        evidence.motion = { elements: normal.count, normallyMoving, stillMovingUnderReduce: moving, textEqual: normal.text === reduced.text, boxesEqual: JSON.stringify(normal.boxes) === JSON.stringify(reduced.boxes), boxes: { normal: normal.boxes, reduced: reduced.boxes } };
        assert.deepEqual(moving, [], 'no stage element keeps a named animation or a non-zero transition under reduce');
        assert.equal(reduced.count, normal.count, 'same element count');
        assert.deepEqual(reduced.motion.map(m => m.path), normal.motion.map(m => m.path), 'same structure');
        assert.equal(normal.text, reduced.text, 'same text');
        assert.deepEqual(reduced.boxes, normal.boxes, 'same geometry');
        const css = await readFile(join(repo, 'style.css'), 'utf8');
        evidence.motion.extensionStylesheet = { animationOrTransitionDeclarations: (css.match(/\b(animation|transition)\b\s*:/g) || []).length, reducedMotionGuard: /@media \(prefers-reduced-motion: reduce\)/.test(css) };
        pass('SYNTHETIC reduced motion (media feature emulated): ' + normallyMoving.length + ' of ' + normal.count + ' stage elements carry a host transition or animation without the preference; under reduce no stage element keeps a named animation or a non-zero transition duration; text, structure and geometry identical');
    }
    if (row === 'assistive') {
        await prepareIndividual();
        evidence.aria = {};
        await openControls(false);
        evidence.aria.readerClosed = await stage().ariaSnapshot();
        await openControls(true);
        await openWhy();
        await openCleanup();
        evidence.aria.controlsWhyCleanupOpen = await stage().ariaSnapshot();
        // Accessible names, computed the way a reader would mostly compute them: aria-label, labelledby, wrapping label, text, title.
        const unnamed = await page.evaluate(() => [...document.querySelectorAll('#sillynovel-stage button, #sillynovel-stage select, #sillynovel-stage input, #sillynovel-stage textarea, #sillynovel-stage summary, #sillynovel-stage [role]')].filter(e => !e.hidden && e.getClientRects().length).map(e => { const byId = e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent; const label = e.closest('label')?.textContent; const name = (e.getAttribute('aria-label') || byId || label || e.textContent || e.title || '').trim(); return { tag: e.tagName.toLowerCase(), role: e.getAttribute('role') || '', type: e.type || '', name: name.slice(0, 60) }; }).filter(x => !x.name && x.role !== 'status'));
        const statuses = await page.evaluate(() => [...document.querySelectorAll('#sillynovel-stage [role="status"]')].map(e => e.className));
        const landmarks = await page.evaluate(() => ({ stage: document.querySelector('#sillynovel-stage').getAttribute('aria-label'), dialogue: document.querySelector('.sillynovel-dialogue').getAttribute('aria-label'), navigation: document.querySelector('.sillynovel-reader__navigation')?.getAttribute('aria-label') ?? null, art: document.querySelector('.sillynovel-art').getAttribute('aria-label'), headings: [...document.querySelectorAll('#sillynovel-stage h1, #sillynovel-stage h2, #sillynovel-stage h3, #sillynovel-stage h4')].map(e => e.tagName + ' ' + e.textContent.trim().slice(0, 40)), liveRegionsInsideWhy: document.querySelectorAll('.sillynovel-why [aria-live], .sillynovel-why [role="status"]').length }));
        evidence.aria.unnamedInteractive = unnamed; evidence.aria.statusRegions = statuses; evidence.aria.landmarks = landmarks;
        assert.deepEqual(unnamed, [], 'every visible interactive element has an accessible name');
        assert.ok(statuses.length >= 4);
        assert.equal(landmarks.liveRegionsInsideWhy, 0, 'excerpts are never announced live (T60)');
        // Keyboard-only path from the stage's first disclosure to the reply field with the controls, the disclosure and the cleanup list open (controls precede the reader in document order).
        await page.locator('.sillynovel-controls summary').focus();
        const order = [];
        for (let i = 0; i < 400; i++) {
            await page.keyboard.press('Tab');
            const here = await page.evaluate(() => { const e = document.activeElement; return { id: e.id, tag: e.tagName.toLowerCase(), name: (e.getAttribute('aria-label') || e.closest('label')?.textContent || e.textContent || '').trim().slice(0, 40), inStage: Boolean(e.closest('#sillynovel-stage')) }; });
            order.push(here);
            if (here.id === 'send_textarea') break;
            if (here.tag === 'body') break;
        }
        evidence.aria.tabOrder = order;
        assert.equal(order.at(-1).id, 'send_textarea', 'Tab from the controls reaches the reply field');
        assert.ok(order.filter(o => o.inStage).length > 10);
        await page.locator('.sillynovel-why summary').focus(); await page.keyboard.press('Escape');
        assert.equal(await page.locator('.sillynovel-why').getAttribute('open'), null);
        assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.sillynovel-why summary')), true, 'Escape returns focus to the summary');
        await openControls(true);
        await shot('assistive-controls-why-cleanup');
        pass('SYNTHETIC accessibility tree: ' + order.length + ' Tab stops from the controls summary to the reply field with controls, disclosure and cleanup open; all visible interactive elements named; ' + statuses.length + ' status regions; no live region inside the disclosure; Escape closes and refocuses. Not a screen reader.');
    }
    if (row === 'groups') {
        evidence.synthetic = false;
        evidence.notTested = ['Physical tablet', 'Other host versions', 'Owner session', 'Individual chat branch and copy (covered by tests/probes/dyl60/host.mjs)'];
        await page.goto(h.origin);
        await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
        const members = [];
        for (const [i, name] of ['Mira', 'Mira', 'Rowan', 'Sage'].entries()) members.push(await (await native('/api/characters/create', { ch_name: name, description: 'Synthetic lantern card ' + i, first_mes: i < 2 ? 'I brought the map back.' : 'Public lantern greeting.' })).text());
        const group = await (await native('/api/groups/create', { name: 'Lantern council', members, activation_strategy: 1 })).json();
        await native('/api/chats/group/save', { id: group.chat_id, chat: [{ chat_metadata: {} }, ...scenario.group.map(t => ({ ...message(t.speaker, t.text), original_avatar: members[t.cardIndex] }))] });
        const council = await makeProject('Council layout', [['Mira', 'left'], ['Mira', 'center'], ['Rowan', 'right'], ['Sage', null]], ['mira-a.png', 'mira-b.png', 'rowan.png', 'sage.png']);
        const saved = await plugin('/projects/' + council.projectId);
        await page.reload();
        await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
        await page.waitForFunction(() => SillyTavern.getContext().characters.length > 0);
        async function openGroup(expectLength) {
            const icon = page.locator('#rightNavDrawerIcon');
            if ((await icon.getAttribute('class')).includes('closedIcon')) await icon.click();
            await page.locator('#right-nav-panel.openDrawer').waitFor({ state: 'visible' });
            if (!await page.locator('#rm_button_create').isVisible()) await page.locator('#rm_button_characters').click();
            await page.locator('#rm_print_characters_block .group_select[data-grid="' + group.id + '"]').click();
            await page.waitForFunction(({ id, n }) => String(SillyTavern.getContext().groupId) === id && SillyTavern.getContext().chat.length === n, { id: group.id, n: expectLength });
            await icon.click(); await page.locator('#right-nav-panel').waitFor({ state: 'hidden' });
        }
        await openGroup(6);
        await enableExtension();
        await page.waitForFunction(() => document.querySelector('.sillynovel-native-context').textContent.includes('Native group'));
        const chatId = () => page.evaluate(() => SillyTavern.getContext().chatId);
        const status = () => page.locator('.sillynovel-project-status').innerText();
        const detached = () => page.waitForFunction(() => document.querySelector('.sillynovel-project-status').textContent.includes('No project attached'));
        const expressionOptions = () => page.locator('[aria-label="Expression to apply · selected source only"] option').count();
        const applyExpression = async () => {
            await importArt(saved.scene.actors[0].actorId);
            if (await button('Jump to Latest').isEnabled()) await button('Jump to Latest').click();
            await button('Previous').click();
            await page.waitForFunction(() => !document.querySelector('[aria-label="Expression to apply · selected source only"]').disabled);
            await button('Apply expression').click();
            await page.waitForFunction(() => Boolean(document.querySelector('.sillynovel-sprite--left img').dataset.expression));
        };
        const parent = await chatId();
        await openProject(council.projectId, 3);
        assert.match(await status(), /Council layout/);
        await applyExpression();
        // Let the host flush the debounced enable write before the baseline inventory; the extension writes nothing after this.
        await until(async () => (await inventory()).settings.extension_settings?.sillynovel?.enabled === true, 'enable write flushed');
        await delay(2500);
        const before = await inventory();
        evidence.groups = { group, members, parent, saved, steps: [] };
        // Which native files the host itself rewrites: the group's own record and files under its chat folder.
        const hostOwned = p => /\/(group chats|groups)\//.test(p);
        // The host rewrites settings.json on its own schedule; the exact changed keys are retained and must never be the extension's.
        const diffPaths = (a, b, at = '') => { if (JSON.stringify(a) === JSON.stringify(b)) return []; if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return [at || '(root)']; return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diffPaths(a[k], b[k], at ? at + '.' + k : k)); };
        const parseChat = async p => (await readFile(join(h.data, p), 'utf8')).trim().split('\n').map(l => JSON.parse(l));
        // The host's branch snapshot adds swipe scaffolding and bookmarking fields of its own; the canonical text, author and card are what must carry over.
        const stripHost = ({ name, mes, is_user, is_system, original_avatar }) => ({ name, mes, is_user, is_system, original_avatar });
        async function compare(step, prior, now) {
            const paths = new Set([...Object.keys(prior.files), ...Object.keys(now.files)]);
            const changed = [...paths].filter(p => JSON.stringify(prior.files[p]) !== JSON.stringify(now.files[p])).sort();
            const settingsKeys = changed.includes('default-user/settings.json') ? diffPaths(prior.settings, now.settings) : [];
            assert.deepEqual(settingsKeys.filter(k => /sillynovel/i.test(k)), [], step + ': the extension writes nothing to settings.json');
            const other = changed.filter(p => !hostOwned(p) && p !== 'default-user/settings.json');
            assert.deepEqual(other, [], step + ': every native file outside the host-owned group record, group chat folder and host-rewritten settings.json is byte-identical');
            for (const p of changed) { const text = await readFile(join(h.data, p), 'utf8'); assert.doesNotMatch(text, /sillynovel|projectId|actorId|prefixSha256|temporary-expression|session-source/i, p + ' carries no extension content'); }
            const entry = { step, changedHostOwned: changed.map(p => ({ path: p, before: prior.files[p] ?? null, after: now.files[p] })), settingsKeysChangedByHost: settingsKeys };
            evidence.groups.steps.push(entry);
            return entry;
        }
        const openExtraButtons = async mesid => {
            await button('Backlog').click();
            const mes = page.locator('#chat .mes[mesid="' + mesid + '"]');
            await mes.scrollIntoViewIfNeeded(); await mes.hover();
            await mes.locator('.extraMesButtonsHint').click();
            await mes.locator('.extraMesButtons').waitFor({ state: 'visible' });
            return mes;
        };
        // 1. Create branch through the host's own message control.
        let mes = await openExtraButtons(2);
        await mes.locator('.mes_create_branch').click();
        await page.waitForFunction(p => SillyTavern.getContext().chatId !== p && SillyTavern.getContext().chat.length === 3, parent);
        const branch = await chatId();
        await detached();
        assert.equal(await page.locator('.sillynovel-sprite:visible').count(), 0);
        await button('Return to Reader').click();
        await delay(2000);
        const afterBranch = await inventory();
        const branchStep = await compare('branch', before, afterBranch);
        branchStep.branch = branch;
        const branchPath = 'default-user/group chats/' + branch + '.jsonl', parentPath = 'default-user/group chats/' + parent + '.jsonl';
        assert.ok(afterBranch.files[branchPath], 'branch file exists');
        const branchChat = await parseChat(branchPath), parentChat = await parseChat(parentPath), parentBefore = before.files[parentPath];
        assert.deepEqual(branchChat.slice(1).map(stripHost), parentChat.slice(1, 4).map(stripHost), 'the branch is the parent prefix through message 2: same text, author and card');
        branchStep.parentChanged = JSON.stringify(parentBefore) !== JSON.stringify(afterBranch.files[parentPath]);
        branchStep.branchMessages = branchChat.length - 1;
        await shot('groups-branch-detached');
        await openProject(council.projectId, 3);
        assert.equal(await expressionOptions(), 1, 'no temporary expression survives into the branch');
        assert.equal(await page.locator('.sillynovel-sprite--left img').getAttribute('data-expression'), '');
        assert.deepEqual(await plugin('/projects/' + council.projectId), saved, 'saved project unchanged by the branch');
        await shot('groups-branch-reopened');
        pass('groups: host Create branch at message 2 of the six-message four-card group opened a new group chat detached, no sprites, no temporary expression; explicit reopen restored the saved global layout only; native files outside the group record and group chat folder byte-identical');
        // 2. Back to the parent through the host's Manage chat files list; the parent is detached too.
        await page.locator('#options_button').click(); await page.locator('#option_select_chat').click();
        await page.locator('#shadow_select_chat_popup').waitFor({ state: 'visible' });
        await page.locator('#select_chat_div .select_chat_block[file_name="' + parent + '"]').click();
        await page.waitForFunction(p => SillyTavern.getContext().chatId === p && SillyTavern.getContext().chat.length === 6, parent);
        await detached();
        assert.equal(await page.locator('.sillynovel-sprite:visible').count(), 0);
        await openProject(council.projectId, 3);
        assert.equal(await expressionOptions(), 1);
        await applyExpression();
        const beforeCheckpoint = await inventory();
        // 3. Create checkpoint (the host's copy) through the message control; the host asks for a name in its own popup.
        mes = await openExtraButtons(3);
        await mes.locator('.mes_create_bookmark').click();
        const popup = page.locator('dialog[open]');
        await popup.waitFor({ state: 'visible' });
        await popup.locator('textarea, input[type="text"]').first().fill('Council checkpoint');
        await popup.locator('.popup-button-ok').click();
        await page.waitForFunction(() => document.querySelector('#chat .mes[mesid="3"]').getAttribute('bookmark_link'));
        const checkpoint = await page.evaluate(() => document.querySelector('#chat .mes[mesid="3"]').getAttribute('bookmark_link'));
        assert.equal(checkpoint, 'Council checkpoint');
        await delay(2000);
        assert.equal(await chatId(), parent, 'checkpoint creation stays in the parent');
        await button('Return to Reader').click();
        assert.match(await status(), /Council layout/, 'creating a copy is not a chat switch: the attachment stays');
        assert.equal(await page.locator('.sillynovel-sprite:visible').count(), 3);
        await button('Previous').click().catch(() => {});
        const afterCheckpoint = await inventory();
        const checkpointStep = await compare('checkpoint', beforeCheckpoint, afterCheckpoint);
        checkpointStep.checkpoint = checkpoint;
        const checkpointPath = 'default-user/group chats/' + checkpoint + '.jsonl';
        assert.ok(afterCheckpoint.files[checkpointPath]);
        const copyChat = await parseChat(checkpointPath), parentNow = await parseChat(parentPath);
        assert.deepEqual(copyChat.slice(1).map(stripHost), parentNow.slice(1, 5).map(stripHost), 'the checkpoint is the parent prefix through message 3');
        checkpointStep.copyMessages = copyChat.length - 1;
        await shot('groups-checkpoint-created-still-attached');
        // 4. Open the checkpoint through the host's flag control.
        await button('Backlog').click();
        await page.locator('#chat .mes[mesid="3"] .mes_bookmark').click();
        await page.waitForFunction(c => SillyTavern.getContext().chatId === c && SillyTavern.getContext().chat.length === 4, checkpoint);
        await detached();
        assert.equal(await page.locator('.sillynovel-sprite:visible').count(), 0);
        await button('Return to Reader').click();
        await openProject(council.projectId, 3);
        assert.equal(await expressionOptions(), 1, 'no temporary expression in the copy');
        await delay(1500);
        await compare('open-checkpoint', afterCheckpoint, await inventory());
        assert.deepEqual(await plugin('/projects/' + council.projectId), saved, 'saved project unchanged by the checkpoint');
        await shot('groups-checkpoint-reopened');
        // 5. Parent again: never reattached automatically; the saved project is still exactly the saved project.
        await page.locator('#options_button').click(); await page.locator('#option_select_chat').click();
        await page.locator('#shadow_select_chat_popup').waitFor({ state: 'visible' });
        await page.locator('#select_chat_div .select_chat_block[file_name="' + parent + '"]').click();
        await page.waitForFunction(p => SillyTavern.getContext().chatId === p && SillyTavern.getContext().chat.length === 6, parent);
        await detached();
        assert.deepEqual(await plugin('/projects/' + council.projectId), saved);
        const groupRecord = JSON.parse(await readFile(join(h.data, 'default-user/groups/' + group.id + '.json'), 'utf8'));
        evidence.groups.groupChatsAfter = groupRecord.chats;
        assert.ok(groupRecord.chats.includes(branch) && groupRecord.chats.includes(checkpoint));
        pass('groups: host Create checkpoint at message 3 kept the attachment (no chat switch); opening the checkpoint through the flag detached with no sprites and no temporary expression; returning to the parent never reattached; saved project byte-equal throughout; every native file outside the group record and group chat folder byte-identical');
    }
    assert.deepEqual(h.pageErrors.filter(text => !/Clicked stop button|Generation was aborted|Got response status|Internal Server Error/.test(text)), []);
    evidence.result = 'PASS';
} catch (error) {
    evidence.result = 'FAIL';
    evidence.error = error.stack;
    console.error(error);
    await page.screenshot({ path: join(root, 'failure.png') }).catch(() => {});
    process.exitCode = 1;
} finally {
    evidence.pageErrors = h.pageErrors;
    await writeFile(join(root, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await h.close();
    console.log('Evidence ' + join(root, 'evidence.json'));
}
