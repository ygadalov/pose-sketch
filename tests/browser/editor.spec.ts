import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const getPose=(page:any)=>page.evaluate(()=> (window as any).poseSketch.getPose());
test('3D editor: coordinates, pole, history, modes, views, persistence, JSON and PNG',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'Скейтбордист',exact:false}).click();await page.locator('#part').selectOption('leftArm');
 for(const [axis,value] of [['X','-1.5'],['Y','4.2'],['Z','1.2']]){await page.getByLabel(`Положение ${axis}`,{exact:true}).fill(value);await page.getByLabel(`Положение ${axis}`,{exact:true}).press('Tab');}
 expect((await getPose(page)).limbs.leftArm.target).toEqual([-1.5,4.2,1.2]);
 await page.locator('#part').selectOption('rightLeg');for(const [axis,value] of [['X','1.2'],['Y','1.5'],['Z','-.8']]){await page.getByLabel(`Положение ${axis}`,{exact:true}).fill(value);await page.getByLabel(`Положение ${axis}`,{exact:true}).press('Tab');}
 await page.locator('#pole').fill('90');await page.locator('#pole').dispatchEvent('change');expect((await getPose(page)).limbs.rightLeg.pole).toBe(90);
 const pose=await getPose(page);await page.locator('#undo').click();expect((await getPose(page)).limbs.rightLeg.pole).toBe(0);await page.locator('#redo').click();expect(await getPose(page)).toEqual(pose);
 await page.getByRole('button',{name:'◒ Объём'}).click();expect(await getPose(page)).toEqual(pose);await page.locator('#overlay').uncheck();await page.getByRole('button',{name:'⌘ Скелет'}).click();expect(await getPose(page)).toEqual(pose);
 for(const name of ['Спереди','Сзади','Слева','Справа','Сверху','¾']){await page.getByRole('button',{name,exact:true}).click();expect(await getPose(page)).toEqual(pose);}
 await page.locator('#projection').selectOption('perspective');await page.locator('#iso').click();
 const exported=page.waitForEvent('download');await page.locator('#export').click();const json=await exported;const path=await json.path();expect(JSON.parse(await fs.readFile(path!,'utf8'))).toEqual(pose);
 await page.locator('#reset').click();await page.locator('#file').setInputFiles(path!);await expect.poll(()=>getPose(page)).toEqual(pose);await page.reload();expect(await getPose(page)).toEqual(pose);
 const pngWait=page.waitForEvent('download');await page.locator('#png').click();const png=await pngWait;await png.saveAs('test-results/export.png');const bytes=await fs.readFile((await png.path())!);expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.length).toBeGreaterThan(10000);
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/workspace/pose-sketch/test-results/desktop.png'});expect(errors).toEqual([]);
});
test('narrow screen has no horizontal overflow and editing remains usable',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('canvas')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);expect(await page.locator('#part').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);await page.locator('#part').selectOption('leftLeg');await page.getByLabel('Положение Z',{exact:true}).fill('1');await page.getByLabel('Положение Z',{exact:true}).press('Tab');expect((await getPose(page)).limbs.leftLeg.target[2]).toBe(1);await page.screenshot({path:'/workspace/pose-sketch/test-results/mobile.png',fullPage:true});});
test('gizmo dragging changes pose while background drag only changes camera',async({page})=>{await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.locator('#part').selectOption('leftArm');await page.locator('#move').click();await page.getByRole('button',{name:'Спереди',exact:true}).click();await page.waitForTimeout(250);const before=await getPose(page);const h=await page.evaluate(()=>(window as any).poseSketch.getHandle());await page.mouse.move(h.x+45,h.y);await page.mouse.down();await page.mouse.move(h.x+85,h.y,{steps:10});await page.mouse.up();const after=await getPose(page);expect(after.limbs.leftArm.target[0]).not.toBe(before.limbs.leftArm.target[0]);const camera=await page.evaluate(()=>(window as any).poseSketch.getCamera());await page.mouse.move(800,210);await page.mouse.down();await page.mouse.move(900,260,{steps:10});await page.mouse.up();await page.waitForTimeout(400);expect(await getPose(page)).toEqual(after);expect(await page.evaluate(()=>(window as any).poseSketch.getCamera())).not.toEqual(camera);});

test('shoulders, elbows and knees are selectable on the figure and directly editable',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.getByRole('button',{name:'Спереди',exact:true}).click();await page.waitForTimeout(250);
 for(const id of ['leftArm:base','leftArm:bend','rightArm:base','rightArm:bend','leftLeg:bend']){
  const pt=await page.evaluate(id=>(window as any).poseSketch.getMarker(id),id);await page.mouse.click(pt.x,pt.y);await expect(page.locator('#part')).toHaveValue(id);
 }
 await page.locator('#part').selectOption('leftArm:base');const old=await getPose(page);
 const field=page.getByLabel('Вращение плеча Z',{exact:true});await field.fill('65');await field.press('Tab');expect((await getPose(page)).limbs.leftArm.target).not.toEqual(old.limbs.leftArm.target);
 await page.locator('#part').selectOption('leftArm:bend');const before=await page.evaluate(()=>(window as any).poseSketch.getJoint('leftArm'));
 await page.getByLabel('Угол сгиба',{exact:true}).fill('100');await page.getByLabel('Угол сгиба',{exact:true}).press('Tab');const after=await page.evaluate(()=>(window as any).poseSketch.getJoint('leftArm'));
 expect(after.flex).toBeCloseTo(100);for(let i=0;i<3;i++)expect(after.joint[i]).toBeCloseTo(before.joint[i]);expect(after.end).not.toEqual(before.end);
 await page.locator('#undo').click();expect((await page.evaluate(()=>(window as any).poseSketch.getJoint('leftArm'))).flex).toBeCloseTo(before.flex);await page.locator('#redo').click();
 // Direct bend handle drag moves the elbow, not just the wrist target.
 const handle=await page.evaluate(()=>(window as any).poseSketch.getHandle());await page.mouse.move(handle.x+45,handle.y);await page.mouse.down();await page.mouse.move(handle.x+75,handle.y,{steps:8});await page.mouse.up();const dragged=await page.evaluate(()=>(window as any).poseSketch.getJoint('leftArm'));expect(dragged.joint).not.toEqual(after.joint);
 const pose=await getPose(page);await page.getByRole('button',{name:'◒ Объём'}).click();expect(await getPose(page)).toEqual(pose);await page.reload();expect(await getPose(page)).toEqual(pose);expect(errors).toEqual([]);
});

test('each body part keeps its own tool when switching between knee and foot',async({page})=>{
 await page.goto('/');await page.locator('#part').selectOption('leftLeg');await page.locator('#rotate').click();
 await page.locator('#part').selectOption('leftLeg:bend');await expect(page.locator('#move')).toHaveClass('active');
 await page.locator('#part').selectOption('leftLeg');await expect(page.locator('#rotate')).toHaveClass('active');expect(await page.evaluate(()=>(window as any).poseSketch.getTool())).toBe('rotate');
 // Choosing IK movement for this foot must survive another joint selection too.
 await page.locator('#move').click();await page.locator('#part').selectOption('head');await page.locator('#part').selectOption('leftLeg');await expect(page.locator('#move')).toHaveClass('active');
 // The opposite foot and wrist have independent defaults and remembered tools.
 await page.locator('#part').selectOption('rightLeg');await expect(page.locator('#rotate')).toHaveClass('active');
 await page.locator('#part').selectOption('leftArm');await page.locator('#move').click();await page.locator('#part').selectOption('leftArm:bend');await page.locator('#rotate').click();await page.locator('#part').selectOption('leftArm');await expect(page.locator('#move')).toHaveClass('active');
});
