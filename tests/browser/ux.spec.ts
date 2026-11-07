import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const pose=(page:any)=>page.evaluate(()=>(window as any).poseSketch.getPose());

test('editing preserves keyboard focus and reports preset and reachability honestly',async({page})=>{
 await page.goto('/');await expect(page.locator('#navigate')).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>(window as any).poseSketch.hasGizmo())).toBe(false);
 await page.locator('[data-preset="Прыжок"]').click();await expect(page.locator('#pose-name')).toHaveText('Прыжок');await page.locator('#part').selectOption('leftArm');
 for(const [axis,value,next] of [['X','-1.6','Положение Y'],['Y','5.8','Положение Z'],['Z','.6','Вращение X']]){
  const field=page.getByLabel(`Положение ${axis}`,{exact:true});await field.fill(value);await field.press('Tab');await expect(page.getByLabel(next,{exact:true})).toBeFocused();
 }
 await expect(page.locator('#pose-name')).toHaveText('Моя поза');await expect(page.locator('[data-preset][aria-pressed="true"]')).toHaveCount(0);
 for(let i=0;i<3;i++)await page.locator('#undo').click();await expect(page.locator('#pose-name')).toHaveText('Прыжок');await expect(page.locator('[data-preset="Прыжок"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#part').selectOption('leftArm:base');
 for(const [axis,value] of [['X','20'],['Y','30'],['Z','15']]){const field=page.getByLabel(`Вращение плеча ${axis}`,{exact:true});await field.fill(value);await field.press('Tab');}
 for(const [axis,value] of [['X','20'],['Y','30'],['Z','15']])await expect(page.getByLabel(`Вращение плеча ${axis}`,{exact:true})).toHaveValue(value);
 await page.locator('#part').selectOption('rightArm');await page.getByLabel('Положение Z',{exact:true}).fill('100');await page.getByLabel('Положение Z',{exact:true}).press('Tab');await expect(page.locator('#reach-note')).toBeVisible();
 await page.getByLabel('Положение Z',{exact:true}).fill('0');await page.getByLabel('Положение Z',{exact:true}).press('Tab');await expect(page.locator('#reach-note')).toBeHidden();
 await page.locator('#part').selectOption('root');const before=await pose(page);await page.getByLabel('Положение X',{exact:true}).fill('');await page.getByLabel('Положение X',{exact:true}).press('Tab');expect(await pose(page)).toEqual(before);await expect(page.getByLabel('Положение Y',{exact:true})).toBeFocused();
 await page.reload();await expect(page.locator('#pose-name')).toHaveText('Моя поза');await expect(page.locator('[data-preset][aria-pressed="true"]')).toHaveCount(0);
});

test('quick-view indicators follow actual camera orientation and stop orbit inertia',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');const start=await page.evaluate(()=>(window as any).poseSketch.getCamera()),before=await pose(page);await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');expect(await page.evaluate(()=>(window as any).poseSketch.getCamera())).not.toEqual(start);expect(await pose(page)).toEqual(before);await page.locator('[data-view="Спереди"]').click();await expect(page.locator('[data-view="Спереди"]')).toHaveAttribute('aria-pressed','true');
 const canvas=(await page.locator('canvas').boundingBox())!;await page.mouse.move(canvas.x+canvas.width*.65,canvas.y+canvas.height*.4);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.65+80,canvas.y+canvas.height*.4+30,{steps:8});await page.mouse.up();
 await expect(page.locator('[data-view][aria-pressed="true"]')).toHaveCount(0);
 await page.locator('[data-view="Спереди"]').click();await page.waitForTimeout(200);await expect(page.locator('[data-view="Спереди"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#iso').click();await expect(page.locator('#iso')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-view][aria-pressed="true"]')).toHaveCount(0);
 await page.locator('#fit').click();await expect(page.locator('[data-view="¾"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#iso')).toHaveAttribute('aria-pressed','false');
});

test('readable labels and keyboard access in desktop, help and mobile drawers',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 const scan=async()=>{const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);};
 await scan();await page.locator('#help').click();await scan();await page.keyboard.press('Escape');await expect(page.locator('#help-dialog')).not.toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.locator('#rotate').click();await page.getByRole('button',{name:'Показать редактор поз',exact:true}).click();
 for(let i=0;i<20;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.querySelector('#editor-shell')!.contains(document.activeElement)||document.activeElement===document.querySelector('#toggle-workshop'))).toBe(true);}
 await scan();await page.keyboard.press('Escape');await expect(page.locator('#editor-panel')).toBeHidden();await expect(page.locator('#toggle-editor')).toBeFocused();expect(await page.evaluate(()=>(window as any).poseSketch.getTool())).toBe('rotate');
 await page.locator('[data-mode="Объём"]').click();await scan();
});

test('phone overlay is reachable and the camera dock never covers the viewport or caption',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto('/');await page.locator('[data-mode="Объём"]').click();await expect(page.getByLabel('Скелет поверх')).toBeVisible();const before=await pose(page);await page.getByLabel('Скелет поверх').check();expect(await pose(page)).toEqual(before);
 for(const [width,height] of [[320,900],[390,844],[844,390],[1024,900]]){
  await page.setViewportSize({width,height});await expect.poll(()=>page.evaluate(()=>{const canvas=document.querySelector('#viewport')!.getBoundingClientRect(),dock=document.querySelector('.camera-bar')!.getBoundingClientRect();return canvas.bottom<=dock.top-10;})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  if(width<=850){const viewport=(await page.locator('#viewport').boundingBox())!,display=(await page.locator('.viewport-top').boundingBox())!;expect(viewport.y).toBeGreaterThanOrEqual(display.y+display.height+10);}
  const caption=page.locator('.canvas-caption');if(await caption.isVisible()){const a=(await caption.boundingBox())!,b=(await page.locator('.camera-bar').boundingBox())!;expect(a.y+a.height).toBeLessThan(b.y);}
 }
});
