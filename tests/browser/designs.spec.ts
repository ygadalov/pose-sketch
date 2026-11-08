import {test,expect} from '@playwright/test';

test('design gallery switches concepts and phone layout without changing the editor',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/designs/');await expect(page.locator('html')).toHaveAttribute('data-ready','true');
 for(const concept of ['atelier','graphite','folio']){
  await page.locator(`button[data-concept="${concept}"]`).click();await expect(page.locator('body')).toHaveAttribute('data-concept',concept);
  await page.locator('[data-size="phone"]').click();await expect(page.locator('.frame-wrap')).toHaveClass(/phone-preview/);
  await page.locator('.mobile-menu').click();await page.locator('[data-pose="Прыжок"]').click();await expect(page.locator('#pose-title')).toHaveText('Прыжок');
  await page.locator('.mobile-menu').click();await page.locator('[data-size="desktop"]').click();
  await page.locator('#part').selectOption('head');await page.getByLabel('Поворот X',{exact:true}).fill('20');await page.getByLabel('Поворот X',{exact:true}).press('Tab');
  await expect(page.getByLabel('Поворот X',{exact:true})).toHaveValue('20');
 }
 expect(errors).toEqual([]);expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
