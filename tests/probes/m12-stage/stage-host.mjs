import assert from 'node:assert/strict';

/** Native pinned-host UI exercise; no host state injection. */
export async function exerciseStage(page,{screenshot,pass}) {
    const field=name=>page.locator('#sillynovel-stage').getByLabel(name,{exact:true});
    const button=name=>page.getByRole('button',{name,exact:true});
    const applied=async name=>{await button(name).click();await page.waitForFunction(()=>document.querySelector('.sillynovel-visual-status').textContent.startsWith('Applied'));};
    const register=async preset=>{
        const count=Number(await page.locator('.sillynovel-cast').getAttribute('data-count'));
        await field('Test actor art').selectOption(preset);await button('Register session actor').click();
        await page.waitForFunction(n=>Number(document.querySelector('.sillynovel-cast').dataset.count)===n+1,count);
        return field('Session actor').inputValue();
    };
    const position=async(key,slot,mode='move')=>{await field('Session actor').selectOption(key);await field('Position').selectOption(slot);await field('Occupied slot action').selectOption(mode);await applied('Apply position');};
    await page.locator('.sillynovel-controls summary').click();
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Test actor art"]').disabled);
    const a=await register('mira-a'),b=await register('mira-b'),r=await register('rowan'),s=await register('sage');
    await field('Background').selectOption('tavern');await applied('Apply background');
    await position(a,'left');await position(b,'right');
    await screenshot(page,'manual-controls');
    await page.locator('.sillynovel-controls summary').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.sillynovel-art img')].filter(e=>!e.hidden).every(e=>e.complete&&e.naturalWidth));
    await screenshot(page,'desktop-tavern');
    assert.equal(await page.locator('.sillynovel-sprite:visible').count(),2);
    assert.match(await page.locator('.sillynovel-cast').innerText(),/Sage.*offstage/);
    pass('stage: tavern with two visible sprites and four manual session actors',{actors:[a,b,r,s]});
    await page.locator('.sillynovel-controls summary').click();
    await field('Session actor').selectOption(a);await field('Expression · selected source only').selectOption(a+':joy-default');await applied('Apply expression');
    await page.locator('.sillynovel-controls summary').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-joy.png')&&document.querySelector('.sillynovel-sprite--left img').complete);
    await screenshot(page,'expression-change');
    await page.locator('.sillynovel-controls summary').click();
    await field('Outfit').selectOption(a+':blue-coat');await applied('Apply outfit');
    await field('Expression · selected source only').selectOption(a+':coat-joy');await applied('Apply expression');
    await page.locator('.sillynovel-controls summary').click();
    await page.waitForFunction(()=>document.querySelector('.sillynovel-sprite--left img').src.endsWith('mira-a-coat-joy.png')&&document.querySelector('.sillynovel-sprite--left img').complete);
    await screenshot(page,'outfit-change');
    await page.locator('.sillynovel-controls summary').click();
    await position(b,'left','swap');assert.equal(await page.locator('.sillynovel-sprite--right').getAttribute('data-actor'),a);
    await field('Session actor').selectOption(a);await field('Outfit').selectOption(a+':missing');await applied('Apply outfit');
    await page.locator('.sillynovel-controls summary').click();
    assert.equal(await page.locator('.sillynovel-sprite--right img').isVisible(),false);
    await screenshot(page,'missing-art-fallback');
    await page.locator('.sillynovel-controls summary').click();
    await field('Outfit').selectOption('');await applied('Apply outfit');
    await page.locator('.sillynovel-controls summary').click();
    pass('stage: outfit/expression changes, explicit swap and missing-art fallback');
    await button('Previous').click();await page.waitForFunction(()=>document.querySelector('.sillynovel-art__background').hidden);
    await button('Next').click();await page.waitForFunction(()=>!document.querySelector('.sillynovel-art__background').hidden);
    for(let i=0;i<3;i++){await button('Back to Chat').click();await button('Return to Reader').click();}
    assert.equal(await page.locator('.sillynovel-sprite--right').getAttribute('data-actor'),a);
    await page.setViewportSize({width:390,height:800});await screenshot(page,'narrow-stage');
    assert.equal(await page.locator('#send_textarea').isVisible(),true);
    const d=await page.locator('.sillynovel-dialogue').boundingBox();assert.ok(d.height>65);
    await page.setViewportSize({width:1440,height:1000});
    pass('stage: source projection, repeated chat return and narrow viewport',{dialogueHeight:d.height});
}
