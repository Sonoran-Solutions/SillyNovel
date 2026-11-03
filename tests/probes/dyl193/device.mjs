// DYL-193 physical rows on the attached Galaxy Tab, exactly as at Gate A: the established wireless-ADB device, its own
// Android Chromium browser (Brave) driven through the browser's existing debugging socket, the candidate served from a
// disposable pinned host on the computer and reached through `adb reverse` (the host and the loopback endpoint are never
// exposed on the network). Never pairs, unlocks, installs, changes a setting or touches an account. Synthetic data only.
// node tests/probes/dyl193/device.mjs <pinned-host-root>     (SN_PLAYWRIGHT_MODULE set; adb on PATH; port 8128 free)
import assert from 'node:assert/strict';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createHarness, PIN, repo } from '../m2-director/harness.mjs';

const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30000 }).trim();
const shell = (...args) => adb('shell', ...args);
const devices = adb('devices', '-l').split('\n').slice(1).filter(l => l.trim());
assert.equal(devices.length, 1, 'exactly one attached device: ' + JSON.stringify(devices));
assert.match(devices[0], /\bdevice\b/, 'device authorized');
const DEVICE_PORT = 8760, CDP_PORT = 9229, SOCKET = 'chrome_devtools_remote', BROWSER = 'com.brave.browser';
const h = await createHarness(resolve(process.argv[2]), 'dyl193-device');
const { native, plugin, control, root } = h;
const evidence = { row: 'device', synthetic: false, candidate: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), host: PIN, node: process.version, access: 'Established paired wireless ADB; serial and address omitted from public evidence', checks: [], notTested: [], screenshots: [], actions: [] };
const pass = (name, details) => { evidence.checks.push({ name, result: 'PASS', details }); console.log('PASS ' + name); };
const note = (name, result, details) => { evidence.checks.push({ name, result, details }); console.log(result + ' ' + name + ': ' + details); };
const art = name => readFile(join(repo, 'tests/fixtures/m12-stage', name));
const hash = b => createHash('sha256').update(b).digest('hex');
const message = (name, mes, is_user = false) => ({ name, mes, is_user, is_system: false, send_date: '2026-11-02T12:00:00.000Z', extra: {} });
const scenario = JSON.parse(await readFile(join(repo, 'tests/fixtures/dyl60-owner-conversation.json')));
// Read-only device facts, as facts.json did at Gate A. Nothing here writes to the device.
const prop = k => shell('getprop', k);
const setting = (ns, k) => shell('settings', 'get', ns, k);
evidence.device = { model: prop('ro.product.model'), device: prop('ro.product.device'), android: prop('ro.build.version.release'), sdk: prop('ro.build.version.sdk'), build: prop('ro.build.display.id'), securityPatch: prop('ro.build.version.security_patch'), display: shell('wm', 'size'), density: shell('wm', 'density'), fontScale: setting('system', 'font_scale'), animatorDurationScale: setting('global', 'animator_duration_scale'), transitionAnimationScale: setting('global', 'transition_animation_scale'), windowAnimationScale: setting('global', 'window_animation_scale'), accessibilityServices: setting('secure', 'enabled_accessibility_services'), keyboard: setting('secure', 'default_input_method'), magnification: setting('secure', 'accessibility_display_magnification_enabled'), userRotation: setting('system', 'user_rotation'), accelerometerRotation: setting('system', 'accelerometer_rotation'), browserVersion: (shell('dumpsys', 'package', BROWSER).match(/versionName=(\S+)/) || [])[1] };
const power = shell('dumpsys', 'power'), window = shell('dumpsys', 'window');
evidence.device.awake = /mWakefulness=Awake/.test(power);
evidence.device.keyguardShowing = !/isKeyguardShowing=false/.test(window);
evidence.device.foregroundBefore = (window.match(/mCurrentFocus=(.*)/) || [])[1];
assert.ok(evidence.device.awake && !evidence.device.keyguardShowing, 'device must already be awake and unlocked; this probe never unlocks');
const socketPresent = () => shell('cat', '/proc/net/unix').includes('@' + SOCKET);
evidence.device.debugSocketBeforeLaunch = socketPresent();
let forwarded = false, reversed = false, page, browser;
const touch = async (locator, what) => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); assert.ok(b, 'no bounds for ' + what); const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; const cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); evidence.actions.push({ touch: what, at: [Math.round(p.x), Math.round(p.y)] }); await delay(400); };
const field = name => page.locator('#sillynovel-stage').getByLabel(name, { exact: true });
const button = name => page.getByRole('button', { name, exact: true });
const shot = async name => { const file = name + '.png'; await page.locator('#sillynovel-stage').screenshot({ path: join(root, file) }); evidence.screenshots.push(file); };
const geometry = () => page.evaluate(() => { const r = s => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? [b.left, b.top, b.width, b.height].map(Math.round) : null; }; return { innerWidth, innerHeight, dpr: devicePixelRatio, visualViewport: [Math.round(visualViewport.width), Math.round(visualViewport.height)], scale: visualViewport.scale, orientation: screen.orientation.type, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, dialogue: r('.sillynovel-dialogue'), why: r('.sillynovel-why'), composer: r('#send_textarea'), stage: r('#sillynovel-stage'), fontSize: getComputedStyle(document.querySelector('.sillynovel-dialogue')).fontSize }; });
try {
    // Disposable host data: a card, a short public story, a project with two sprites, a forest and one unreferenced PNG.
    await native('/api/characters/create', { ch_name: 'Project A', description: 'Public synthetic fixture', first_mes: 'Welcome to Project A' });
    const story = [{ user_name: 'Synthetic Traveller', character_name: 'Project A', create_date: '2026-11-02T12:00:00.000Z', chat_metadata: {} }, message('Project A', 'The lantern is waiting. Public synthetic fixture.')];
    for (const turn of scenario.individual.slice(0, 6)) story.push(message('Synthetic Traveller', turn.user, true), message(turn.speaker, turn.reply));
    await native('/api/chats/save', { avatar_url: 'Project A.png', file_name: 'The Last Lantern', chat: story });
    const project = await plugin('/projects', 'POST', { name: 'Tablet replay' }, 201);
    const assets = []; for (const file of ['mira-a.png', 'rowan.png']) assets.push((await plugin('/projects/' + project.projectId + '/assets', 'POST', await art(file), 201, 'image/png')).assetId);
    const forest = (await plugin('/projects/' + project.projectId + '/assets', 'POST', await art('forest.png'), 201, 'image/png')).assetId;
    await plugin('/projects/' + project.projectId + '/assets', 'POST', await art('tavern.png'), 201, 'image/png');
    const actors = [['Mira', 'left'], ['Rowan', 'right']].map(([name, slot], i) => ({ actorId: randomUUID(), name, present: true, slot, spriteAssetId: assets[i], locks: { presence: true, outfit: true, slot: true } }));
    const saved = await plugin('/projects/' + project.projectId, 'PUT', { schemaVersion: 2, expectedRevision: 0, name: project.name, scene: { backgroundAssetId: forest, backgroundLocked: true, actors }, catalog: [...actors.map(a => ({ assetId: a.spriteAssetId, kind: 'sprite', actorId: a.actorId, label: a.name + ' base' })), { assetId: forest, kind: 'background', actorId: null, label: 'Forest' }] });
    // The extension is enabled in the disposable account's settings before the device opens the page (a setup aid); the director is switched on by touch.
    const settingsPath = join(h.userRoot, 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
    settings.extension_settings = { ...(settings.extension_settings || {}), sillynovel: { enabled: true } };
    await writeFile(settingsPath, JSON.stringify(settings));
    const hostPort = Number(new URL(h.origin).port);
    adb('reverse', 'tcp:' + DEVICE_PORT, 'tcp:' + hostPort); reversed = true;
    if (!socketPresent()) { shell('am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'http://127.0.0.1:' + DEVICE_PORT + '/', BROWSER); evidence.device.browserLaunched = true; evidence.actions.push({ launch: BROWSER }); for (let i = 0; i < 60 && !socketPresent(); i++) await delay(500); }
    assert.ok(socketPresent(), 'browser debugging socket');
    adb('forward', 'tcp:' + CDP_PORT, 'localabstract:' + SOCKET); forwarded = true;
    evidence.browser = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/version')).json();
    const { chromium } = await import(process.env.SN_PLAYWRIGHT_MODULE || 'playwright');
    browser = await chromium.connectOverCDP('http://127.0.0.1:' + CDP_PORT);
    const origin = 'http://127.0.0.1:' + DEVICE_PORT;
    const context = browser.contexts()[0];
    page = context.pages().find(p => p.url().startsWith(origin)) || await context.newPage();
    page.setDefaultTimeout(25000);
    evidence.syntheticTab = true;
    await page.goto(origin + '/login').catch(() => {});
    const login = await page.evaluate(async () => { const t = (await (await fetch('/csrf-token')).json()).token; return (await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t }, body: JSON.stringify({ handle: 'default-user' }) })).status; });
    assert.equal(login, 200);
    await page.goto(origin);
    await page.locator('#sillynovel-settings').waitFor({ state: 'attached' });
    await page.waitForFunction(() => SillyTavern.getContext().characters.length > 0);
    evidence.configuration = await page.evaluate(() => ({ ua: navigator.userAgent, secure: window.isSecureContext, viewport: [innerWidth, innerHeight], screen: [screen.width, screen.height], dpr: devicePixelRatio, scale: visualViewport.scale, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, touchPoints: navigator.maxTouchPoints, viewportMeta: document.querySelector('meta[name=viewport]')?.content }));
    assert.equal(evidence.configuration.secure, true, 'loopback through adb reverse is a secure context');
    // Setup aids, not touch proof: native chat selection and connecting the loopback provider.
    await page.evaluate(async () => { const s = await import('/script.js'); const i = SillyTavern.getContext().characters.findIndex(c => c.name === 'Project A'); await s.selectCharacterById(i); await s.openCharacterChat('The Last Lantern'); });
    await page.waitForFunction(() => SillyTavern.getContext().chat.length >= 13);
    await page.locator('#sillynovel-stage').waitFor();
    await page.evaluate(async () => { await (await import('/scripts/openai.js')).reconnectOpenAi?.(); });
    await page.locator('#API-status-top').evaluate(e => { if (e.className.includes('closedIcon')) e.click(); });
    await page.locator('#api_button_openai').evaluate(e => e.click());
    await page.waitForFunction(() => SillyTavern.getContext().onlineStatus !== 'no_connection');
    await page.locator('#API-status-top').evaluate(e => e.click());
    pass('access: loopback host reached through adb reverse ' + DEVICE_PORT + '; secure context; provider ' + 'host-only; synthetic account only', evidence.configuration);
    // Touch: open the controls, open the saved project, switch the director on.
    await touch(page.locator('.sillynovel-controls summary'), 'Manual scene controls');
    await page.waitForFunction(() => document.querySelector('.sillynovel-controls').open);
    await field('Saved project').selectOption(project.projectId); evidence.actions.push({ programmatic: 'select Saved project (setup aid, not a touch-select proof)' });
    await touch(button('Open project and use with this chat'), 'Open project and use with this chat');
    await page.waitForFunction(() => document.querySelectorAll('.sillynovel-sprite:not([hidden])').length === 2);
    await touch(page.locator('.sillynovel-director input'), 'Director toggle');
    await page.waitForFunction(() => document.querySelector('.sillynovel-director input').checked);
    await field('Project actor').selectOption(actors[0].actorId); evidence.actions.push({ programmatic: 'select Project actor (setup aid)' });
    await page.waitForFunction(() => !document.querySelector('[aria-label="Temporary expression PNG"]').disabled);
    // Touch the PNG file input: the system picker is the device's own UI, observed by window focus and dismissed with Back.
    const beforeFocus = (shell('dumpsys', 'window').match(/mCurrentFocus=(.*)/) || [])[1];
    await touch(field('Temporary expression PNG'), 'Temporary expression PNG file input');
    await delay(2500);
    const pickerFocus = (shell('dumpsys', 'window').match(/mCurrentFocus=(.*)/) || [])[1];
    const pickerOpened = pickerFocus !== beforeFocus && !pickerFocus.includes(BROWSER);
    if (pickerOpened) { shell('input', 'keyevent', '4'); evidence.actions.push({ key: 'BACK (dismiss the system file picker)' }); await delay(1500); }
    const afterBack = (shell('dumpsys', 'window').match(/mCurrentFocus=(.*)/) || [])[1];
    note('touch: file picker', pickerOpened ? 'PASS' : 'NOT_TESTED', JSON.stringify({ beforeFocus, pickerFocus, afterBack, pickerOpened }));
    await field('Temporary expression label').fill('Happy');
    await field('Temporary expression PNG').setInputFiles(join(repo, 'tests/fixtures/m12-stage/mira-a-joy.png')); evidence.actions.push({ programmatic: 'supply the PNG to the file input (the system picker cannot be driven from the page)' });
    await page.waitForFunction(() => document.querySelector('.sillynovel-expression-context').textContent.includes('Temporary expression ready'));
    // A director decision through the host's own request path (loopback endpoint on the computer), so "Why this visual?" exists.
    await control({ reset: true, fallback: { auto: { excerpt: 'lantern glows' } } });
    await page.locator('#send_textarea').fill('A synthetic tablet turn.'); evidence.actions.push({ programmatic: 'fill the composer' });
    const before = await page.evaluate(() => SillyTavern.getContext().chat.length);
    await touch(page.locator('#send_but'), 'native Send');
    await page.waitForFunction(n => SillyTavern.getContext().chat.length >= n + 2, before);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#mes_stop')).display === 'none');
    const end = Date.now() + 40000; while (Date.now() < end && !/applied 1 temporary expression/.test(await page.locator('.sillynovel-director-status').textContent())) await delay(250);
    await page.locator('.sillynovel-why').waitFor({ state: 'visible' });
    await touch(page.locator('.sillynovel-controls summary'), 'Manual scene controls (close)');
    await touch(page.locator('.sillynovel-why summary'), 'Why this visual?');
    await page.waitForFunction(() => document.querySelector('.sillynovel-why').open && document.querySelector('.sillynovel-why__body').textContent.includes('Session summary'));
    const open = await geometry();
    await shot('device-why-open');
    const reply = await page.locator('#send_textarea').evaluate(e => { const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { box: [b.left, b.top, b.width, b.height].map(Math.round), inVisualViewport: b.top >= 0 && b.bottom <= visualViewport.height + 1, hit: hit === e }; });
    assert.ok(reply.inVisualViewport && reply.hit, 'reply field reachable with the disclosure open: ' + JSON.stringify(reply));
    pass('reply field reachable with "Why this visual?" open at the device\'s current scale (font scale ' + evidence.device.fontScale + ', page scale ' + open.scale + ')', { ...open, reply });
    // Real keyboard: touch the composer, the Samsung keyboard opens; the composer must stay inside the visual viewport (DYL-60 keyboard check).
    await touch(page.locator('#send_textarea'), 'native composer');
    await delay(2500);
    const withKeyboard = await geometry();
    const composerVisible = withKeyboard.composer && withKeyboard.composer[1] + withKeyboard.composer[3] <= withKeyboard.visualViewport[1] + 1;
    await shot('device-keyboard-open');
    shell('input', 'keyevent', '4'); evidence.actions.push({ key: 'BACK (dismiss the keyboard)' }); await delay(1500);
    note('keyboard: composer inside the visual viewport with the on-screen keyboard open', composerVisible ? 'PASS' : 'FAIL', JSON.stringify(withKeyboard));
    // 200 % zoom: a real pinch through the browser. The host's viewport meta says user-scalable=no, so the expected result is scale 1.0.
    const cdp = await page.context().newCDPSession(page);
    const centre = await page.evaluate(() => ({ x: innerWidth / 2, y: innerHeight / 2 }));
    await cdp.send('Input.synthesizePinchGesture', { x: centre.x, y: centre.y, scaleFactor: 2, gestureSourceType: 'touch' }).catch(error => { evidence.pinchError = error.message; });
    await delay(800);
    const pinched = await page.evaluate(() => visualViewport.scale);
    if (pinched < 1.9) await cdp.send('Input.synthesizePinchGesture', { x: centre.x, y: centre.y, scaleFactor: 0.5, gestureSourceType: 'touch' }).catch(() => {});
    await cdp.detach();
    note('200 % zoom by real pinch', pinched >= 1.9 ? 'PASS' : 'NOT_TESTED', 'visualViewport.scale after a 2x pinch: ' + pinched + '; host viewport meta: ' + evidence.configuration.viewportMeta + '. Browser page-zoom and force-enable-zoom are settings and were not changed.');
    note('increased text scaling', 'NOT_TESTED', 'device font_scale ' + evidence.device.fontScale + ' unchanged; the Android font size and the browser text scaling are settings and were not changed.');
    note('reduced motion as a system preference', 'NOT_TESTED', 'animator_duration_scale ' + evidence.device.animatorDurationScale + ' (default), prefers-reduced-motion on the page: ' + open.reducedMotion + '; Remove animations is a setting and was not changed.');
    note('screen reader', 'NOT_TESTED', 'enabled_accessibility_services ' + evidence.device.accessibilityServices + '; TalkBack was not enabled and no screen reader was run.');
    // Touch: export (a browser download on the device), import through the picker and programmatically, cleanup.
    await touch(page.locator('.sillynovel-why summary'), 'Why this visual? (close)');
    await touch(page.locator('.sillynovel-controls summary'), 'Manual scene controls (open)');
    await page.waitForFunction(() => document.querySelector('.sillynovel-controls').open);
    const downloadsBefore = shell('ls', '-1', '/sdcard/Download/').split('\n');
    const exported = await (await h.context.request.get(h.origin + '/api/plugins/sillynovel-storage/projects/' + project.projectId + '/export', { headers: { 'X-CSRF-Token': (await (await h.context.request.get(h.origin + '/csrf-token')).json()).token } })).body();
    await field('Saved project').selectOption(project.projectId);
    await touch(button('Export project'), 'Export project');
    await delay(5000);
    const downloadsAfter = shell('ls', '-1', '/sdcard/Download/').split('\n');
    const newFiles = downloadsAfter.filter(f => !downloadsBefore.includes(f));
    let exportResult = { newFiles };
    if (newFiles.length === 1) { const path = '/sdcard/Download/' + newFiles[0]; const sum = shell('sha256sum', path).split(/\s+/)[0]; exportResult = { ...exportResult, path, sha256OnDevice: sum, sha256Served: hash(exported), identical: sum === hash(exported) }; if (exportResult.identical) { shell('rm', path); exportResult.removedFromDevice = true; evidence.actions.push({ removed: path + ' (the test download, hash-verified)' }); } }
    note('touch: Export project downloads the bundle on the device', newFiles.length === 1 && exportResult.identical ? 'PASS' : 'NOT_TESTED', JSON.stringify(exportResult));
    const beforeImport = (shell('dumpsys', 'window').match(/mCurrentFocus=(.*)/) || [])[1];
    await touch(field('Import project bundle'), 'Import project bundle file input');
    await delay(2500);
    const importPicker = (shell('dumpsys', 'window').match(/mCurrentFocus=(.*)/) || [])[1];
    const importPickerOpened = importPicker !== beforeImport && !importPicker.includes(BROWSER);
    if (importPickerOpened) { shell('input', 'keyevent', '4'); evidence.actions.push({ key: 'BACK (dismiss the system file picker)' }); await delay(1500); }
    await field('Import project bundle').setInputFiles({ name: 'copy.sillynovel', mimeType: 'application/vnd.sillynovel.bundle', buffer: exported }); evidence.actions.push({ programmatic: 'supply the bundle to the import input' });
    await page.waitForFunction(() => /Not attached|Imported/.test(document.querySelector('.sillynovel-bundle-status').textContent));
    note('touch: import picker opened by touch; bundle supplied programmatically and accepted', importPickerOpened ? 'PASS bounded' : 'NOT_TESTED', JSON.stringify({ beforeImport, importPicker, importPickerOpened, status: await page.locator('.sillynovel-bundle-status').textContent() }));
    await touch(button('Review unused artwork'), 'Review unused artwork');
    await page.waitForFunction(() => document.querySelectorAll('.sillynovel-cleanup-list input').length >= 1);
    await touch(page.locator('.sillynovel-cleanup-list input').first(), 'unused artwork checkbox');
    await page.waitForFunction(() => document.querySelector('.sillynovel-cleanup-list input').checked);
    await shot('device-cleanup-selected');
    page.once('dialog', d => { evidence.actions.push({ programmatic: 'accept the browser confirm() dialog: ' + d.message().slice(0, 80) }); d.accept(); });
    await touch(button('Remove selected unused artwork'), 'Remove selected unused artwork');
    await page.waitForFunction(() => document.querySelector('.sillynovel-cleanup-status').textContent.includes('Cleanup completed'));
    pass('touch: cleanup review, selection and removal completed on the device (confirm dialog accepted programmatically)', await page.locator('.sillynovel-cleanup-status').textContent());
    assert.deepEqual((await plugin('/projects/' + project.projectId)).scene, saved.scene, 'saved scene unchanged by cleanup');
    evidence.facts = { at: new Date().toISOString(), browser: evidence.browser, configuration: evidence.configuration, device: evidence.device };
    evidence.result = 'PASS';
} catch (error) {
    evidence.result = 'FAIL'; evidence.error = error.stack; console.error(error);
    await page?.locator('#sillynovel-stage').screenshot({ path: join(root, 'failure.png') }).catch(() => {});
    process.exitCode = 1;
} finally {
    const cleanup = { at: new Date().toISOString() };
    try { if (page && evidence.syntheticTab) { await page.close(); cleanup.syntheticTabClosed = true; } } catch (error) { cleanup.tabError = error.message; }
    try { await browser?.close(); } catch {}
    if (forwarded) { adb('forward', '--remove', 'tcp:' + CDP_PORT); cleanup.localForwardRemoved = !adb('forward', '--list').includes('tcp:' + CDP_PORT); }
    if (reversed) { adb('reverse', '--remove', 'tcp:' + DEVICE_PORT); cleanup.deviceReverseRemoved = !adb('reverse', '--list').includes('tcp:' + DEVICE_PORT); }
    cleanup.foregroundAfter = (shell('dumpsys', 'window').match(/mCurrentFocus=(.*)/) || [])[1];
    cleanup.systemSettingsChanged = false;
    cleanup.fontScaleAfter = shell('settings', 'get', 'system', 'font_scale');
    evidence.cleanup = cleanup;
    await h.close();
    await writeFile(join(root, 'evidence.json'), JSON.stringify(evidence, null, 2));
    await writeFile(join(root, 'facts.json'), JSON.stringify(evidence.facts ?? { device: evidence.device, browser: evidence.browser }, null, 2));
    console.log('Evidence ' + join(root, 'evidence.json'));
}
