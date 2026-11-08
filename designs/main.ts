import './style.css';
import * as T from 'three';
import {View} from '../src/scene';
import {preset,type Pose,type V} from '../src/model';
import {download} from '../src/storage';

const icons:Record<string,string>={
 logo:'<circle cx="12" cy="4" r="2"/><path d="m5 11 7-3 7 3M12 8v6m0 0-5 7m5-7 5 7"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 hand:'<path d="M7 13V6a1.5 1.5 0 0 1 3 0v5m0-5V4a1.5 1.5 0 0 1 3 0v7m0-5V5a1.5 1.5 0 0 1 3 0v7m0-4a1.5 1.5 0 0 1 3 0v7c0 3-2 6-5 6h-3c-3-2-4-4-7-8-1-2 1-3 2-2l2 2"/>',
 orbit:'<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(-30 12 12)"/>',
 move:'<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m3 3 3 3-3 3M9 18l3 3 3-3M6 9l-3 3 3 3"/>',
 fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path d="M8 8h8v8H8z"/>',
 reset:'<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>',
 grid:'<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
 cube:'<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10v8M3 8l9 5 9-5M8 5l9 5v7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 arrows:'<path d="m8 4-5 5 5 5M3 9h12a6 6 0 0 1 0 12"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 pencil:'<path d="m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4"/>',
 eye:'<path d="M2 12c5-9 15-9 20 0-5 9-15 9-20 0Z"/><circle cx="12" cy="12" r="3"/>',
};
const icon=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.cube}</svg>`;
type Concept='atelier'|'graphite'|'folio';
const concepts:Record<Concept,{name:string;index:string;tag:string;description:string}>={
 atelier:{name:'Atelier',index:'01',tag:'Тихая мастерская',description:'Тёплый светлый интерфейс, ясная иерархия и привычные боковые панели. Спокойная среда для долгой практики.'},
 graphite:{name:'Graphite',index:'02',tag:'Профессиональный инструмент',description:'Тёмная оболочка, компактные команды и точный инспектор. Для тех, кто привык к графическим и 3D-редакторам.'},
 folio:{name:'Folio',index:'03',tag:'Художественный референс',description:'Редакционная типографика, свободное полотно и плавающие карточки. Больше внимания фигуре и характеру приложения.'},
};
const params=new URLSearchParams(location.search);
let concept:Concept=(['atelier','graphite','folio'].includes(params.get('concept')||'')?params.get('concept'):'atelier') as Concept;
let capture=params.get('capture')==='1';
let pose:Pose=preset('Скейтбордист');
let currentPose='Баланс';
const data=[{name:'Стоя',sub:'Нейтральная поза',key:'Исходная'},{name:'Прыжок',sub:'Линия движения',key:'Прыжок'},{name:'Баланс',sub:'Опора и равновесие',key:'Скейтбордист'}];
const thumbs=(i:number)=>{const arms=['M20 29 9 46M34 29 45 46','M20 29 11 12M34 29 44 12','M20 29 5 23M34 29 49 21'][i];const legs=['M23 47 17 72M31 47 38 72','M23 47 14 57 22 70M31 47 43 55 45 66','M23 47 10 60 5 69M31 47 43 56 47 68'][i];return `<svg class="pose-drawing" viewBox="0 0 56 80" aria-hidden="true"><ellipse cx="27" cy="17" rx="6" ry="8"/><path d="M27 25v22M20 29h14M23 47h8${arms}${legs}"/><circle cx="20" cy="29" r="2"/><circle cx="34" cy="29" r="2"/><circle cx="23" cy="47" r="2"/><circle cx="31" cy="47" r="2"/></svg>`;};
const base=import.meta.env.BASE_URL;
const root=document.querySelector<HTMLDivElement>('#designs')!;
root.innerHTML=`<div class="gallery-head"><a class="gallery-brand" href="${base}">${icon('logo')}<b>PoseSketch</b><span>Design collection</span></a><a class="back-app" href="${base}">Текущий редактор ${icon('arrow')}</a></div>
<section class="gallery-intro"><div><span class="overline">Три направления · desktop + mobile</span><h1>Какой будет ваша мастерская?</h1><p>Сравните три оболочки на одной позе. Вращайте модель, меняйте ракурсы и размер экрана.</p></div><span class="edition">Дизайн-концепции<br>ноябрь 2026</span></section>
<nav class="concept-nav" aria-label="Варианты дизайна">${Object.entries(concepts).map(([id,c])=>`<button data-concept="${id}"><span>${c.index}</span><strong>${c.name}</strong><small>${c.tag}</small>${icon('arrow')}</button>`).join('')}</nav>
<div class="preview-heading"><p id="concept-description"></p><div class="preview-controls"><button data-size="desktop" class="selected">Компьютер</button><button data-size="phone">Телефон</button><a id="fullscreen" target="_blank">Открыть макет ${icon('arrow')}</a></div></div>
<div class="frame-wrap" id="preview"><div id="shell" class="shell"><header class="app-header"><button class="mobile-menu" aria-label="Открыть библиотеку поз">${icon('menu')}</button><a class="app-brand" href="?concept=${concept}">${icon('logo')}<span>PoseSketch</span></a><span class="project-crumb"><span class="project-category">Мастерская</span><i>/</i> Этюд движения ${icon('chevron')}</span><span class="folio-topline">Место для вашей практики</span><div class="app-actions"><span class="save-state"><i></i> Демонстрационная поза</span><button class="quiet-button help-button" title="О макете">${icon('eye')}<span>Обзор</span></button><button class="export-button">${icon('download')}<span>Экспорт PNG</span></button></div></header>
<div class="command-bar"><span class="command-title">Этюд движения <span>·</span> Баланс</span><span class="command-hint">Один палец — вращение · два — масштаб</span><span class="command-format">Позы / 01</span></div>
<div class="app-body"><aside class="library"><div class="section-head"><div><span class="eyebrow">Коллекция</span><h2>Готовые позы</h2></div><button class="small-icon new-pose" aria-label="Исходная поза">${icon('plus')}</button></div><p class="library-intro">Начните с формы.<br>Найдите своё движение.</p><div class="library-list">${data.map((d,i)=>`<button class="pose-card ${d.name===currentPose?'selected':''}" data-pose="${d.key}"><span class="pose-thumb">${thumbs(i)}</span><span class="pose-copy"><strong>${d.name}</strong><small>${d.sub}</small></span><span class="pose-indicator">${icon('check')}</span></button>`).join('')}</div><div class="library-foot"><span class="library-foot-icon">${icon('pencil')}</span><h3>Сначала — силуэт.</h3><p>Поворот камеры часто<br>рассказывает больше, чем деталь.</p></div></aside>
<section class="studio"><div class="stage-title"><span class="editorial-index">Лист 01</span><h2>Поймать равновесие<span>.</span></h2><p>Поза для вашего следующего рисунка</p></div><div id="scene"></div><div class="display-switch" role="group" aria-label="Вид фигуры"><button data-display="Объём" class="selected">${icon('cube')} Объём</button><button data-display="Скелет">${icon('logo')} Линии</button></div><div class="stage-tag"><i></i> Свободный обзор <span>H</span></div><div class="scene-tools" role="group" aria-label="Камера"><button data-tool="orbit" class="selected" title="Вращение камеры">${icon('orbit')}</button><button data-tool="pan" title="Сдвиг камеры">${icon('hand')}</button><span></span><button class="fit" title="Показать фигуру целиком">${icon('fit')}</button><button class="reset" title="Вернуть ракурс">${icon('reset')}</button></div><div class="scene-caption"><span class="caption-kicker">Сейчас на холсте</span><strong id="pose-title">Баланс</strong><small>Поза 03 <span>—</span> Взрослая фигура</small></div><div class="orientation"><span class="axis-y">Y</span><span class="axis-x">X</span><span class="axis-z">Z</span><i></i></div><div class="view-dock"><div class="views"><button data-angle="Спереди">Спереди</button><button data-angle="Справа">Сбоку</button><button data-angle="¾" class="selected">¾</button></div><span class="dock-divider"></span><button class="fit" title="Вписать фигуру">${icon('fit')}</button><select id="projection" aria-label="Проекция"><option value="ortho">Ортография</option><option value="perspective">Перспектива</option></select><button id="grid" class="selected" title="Показать или скрыть сетку">${icon('grid')}</button></div><div class="gesture-hint">Тяните сцену, чтобы найти свой ракурс <span>·</span> Колёсико меняет масштаб</div></section>
<aside class="inspector"><div class="sheet-handle"></div><div class="section-head"><div><span class="eyebrow">Постановка</span><h2>Свойства позы</h2></div><span class="inspector-status">${icon('check')}</span></div><div class="inspector-tabs"><span class="active">Настройка корпуса</span></div><label class="property-label" for="part">Выбранная часть</label><div class="part-select">${icon('logo')}<select id="part"><option value="chest">Грудная клетка</option><option value="head">Голова</option><option value="pelvis">Таз</option></select></div><div class="property-row"><h3>Поворот</h3><span>градусы</span></div><div id="coordinates" class="coordinates"></div><p class="property-help">Поверните корпус, чтобы усилить<br>характер и линию движения.</p><div class="slider-block"><div><h3>Ось Y</h3><span id="angle-value">−30°</span></div><input type="range" id="angle" min="-90" max="90" value="-30" aria-label="Поворот вокруг Y"><div class="slider-endpoints"><span>−90°</span><span>0°</span><span>90°</span></div></div><div class="limit-line"><div><strong>Естественный сгиб</strong><small>Учитывать ограничения суставов</small></div><button class="toggle on" id="limits" role="switch" aria-checked="true" aria-label="Ограничения суставов"><i></i></button></div><div class="inspector-note">${icon('hand')}<p>Нужен другой взгляд?<br><span>Вращайте сцену, сохраняя позу.</span></p></div><button class="reset-pose">${icon('reset')} Исходная поза</button><div class="inspector-bottom"><span>Точность начинается с наблюдения.</span><b>PS / 01</b></div></aside>
</div><div class="mobile-bottom"><button data-mobile="poses">${icon('logo')}Позы</button><button data-mobile="properties">${icon('pencil')}Суставы</button><button data-mobile="camera" class="selected">${icon('orbit')}Камера</button></div><div class="app-footer"><span>Этюд движения <i>·</i> <span class="footer-pose">Баланс</span></span><span class="footer-message">Обзор камеры · поза сохраняется</span><span>Создано для практики ${icon('sun')}</span></div><button class="dismiss-drawer" aria-label="Закрыть панель" hidden></button></div></div>
<section class="comparison"><div class="comparison-title"><span class="overline">Параллельный просмотр</span><h2>Три характера одной студии</h2></div><div class="comparison-grid">${Object.entries(concepts).map(([id,c])=>`<a class="comparison-card" href="?concept=${id}#preview"><div class="comparison-picture"><img src="${base}designs/previews/${id}-desktop.png" alt="Макет ${c.name} на компьютере" loading="lazy"><img class="phone-mini" src="${base}designs/previews/${id}-phone.png" alt="Мобильный макет ${c.name}" loading="lazy"></div><div><span>${c.index}</span><h3>${c.name}</h3><p>${c.tag}</p>${icon('arrow')}</div></a>`).join('')}</div></section><footer class="gallery-footer"><p>Это варианты оболочки. Сцена, пресеты, камера и параметры корпуса работают; часть служебных подписей демонстрирует композицию.</p><a href="${base}">Вернуться к редактору ${icon('arrow')}</a></footer><div id="notice" role="status"></div>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const shell=$('shell');
const view=new View($('scene'));view.mode='Объём';view.setNavigation(true);
const ground=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;view.scene.add(ground);
view.renderer.shadowMap.enabled=true;view.renderer.shadowMap.type=T.PCFSoftShadowMap;
for(const object of view.scene.children)if(object instanceof T.DirectionalLight){object.castShadow=true;object.shadow.mapSize.set(1024,1024);object.shadow.camera.left=-8;object.shadow.camera.right=8;object.shadow.camera.top=8;object.shadow.camera.bottom=-8;object.shadow.bias=-.0003;object.shadow.normalBias=.025;}
let guideGrid=new T.GridHelper(20,40,0xd0d1c7,0xe3e4dc);view.grid.visible=false;view.scene.add(guideGrid);
const notice=(message:string)=>{$('notice').textContent=message;$('notice').classList.add('visible');setTimeout(()=>$('notice').classList.remove('visible'),2500);};
function applyTheme(){
 document.querySelector<HTMLAnchorElement>('.app-brand')!.href=`?concept=${concept}&capture=${capture?'1':'0'}`;document.body.dataset.concept=concept;document.body.classList.toggle('capture',capture);shell.className=`shell ${concept}`;
 document.querySelectorAll<HTMLElement>('button[data-concept]').forEach(b=>{const active=b.dataset.concept===concept;b.classList.toggle('selected',active);b.setAttribute('aria-current',active?'true':'false');});
 $('concept-description').innerHTML=`<strong>${concepts[concept].name}</strong> ${concepts[concept].description}`;
 $<HTMLAnchorElement>('fullscreen').href=`?concept=${concept}&capture=1`;
 const dark=concept==='graphite';const background=dark?0x171c23:concept==='folio'?0xf4f0e8:0xf1f1eb;
 view.scene.background=new T.Color(background);
 view.scene.remove(guideGrid);guideGrid.geometry.dispose();(guideGrid.material as T.Material).dispose();guideGrid=new T.GridHelper(20,40,dark?0x35414a:concept==='folio'?0xd0c7b8:0xd0d1c7,dark?0x252e37:concept==='folio'?0xe2dbd0:0xe3e4dc);guideGrid.visible=$('grid').classList.contains('selected');view.scene.add(guideGrid);
 refresh();requestAnimationFrame(()=>{view.resize();view.fit();});
}
function refresh(){
 view.update(pose);view.setNavigation(true);view.model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;if(concept==='graphite'&&view.mode==='Объём'){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m instanceof T.MeshStandardMaterial)m.color.set(0xcbd3d2);});}}});view.dirty=true;
 const part=$<HTMLSelectElement>('part').value as 'chest'|'head'|'pelvis';const values=pose[part];$('coordinates').innerHTML=values.map((n,i)=>`<label><span>${'XYZ'[i]}</span><input type="number" aria-label="Поворот ${'XYZ'[i]}" value="${Math.round(n)}" min="-90" max="90" data-axis="${i}"><small>°</small></label>`).join('');
 $<HTMLInputElement>('angle').value=String(values[1]);$('angle-value').textContent=`${Math.round(values[1])}°`;
 $('coordinates').querySelectorAll<HTMLInputElement>('input').forEach(input=>input.onchange=()=>{const n=Number(input.value);if(Number.isFinite(n)){pose[part][Number(input.dataset.axis)]=Math.max(-90,Math.min(90,n));refresh();}});
 $('pose-title').textContent=currentPose;document.querySelector('.footer-pose')!.textContent=currentPose;document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>button.classList.toggle('selected',data.find(d=>d.key===button.dataset.pose)?.name===currentPose));
}
document.querySelectorAll<HTMLButtonElement>('[data-concept]').forEach(button=>button.onclick=()=>{concept=button.dataset.concept as Concept;history.replaceState(null,'',`?concept=${concept}`);applyTheme();});
document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach(button=>button.onclick=()=>{const phone=button.dataset.size==='phone';document.querySelector('.frame-wrap')!.classList.toggle('phone-preview',phone);document.querySelectorAll('[data-size]').forEach(b=>b.classList.toggle('selected',b===button));shell.classList.toggle('phone',phone);requestAnimationFrame(()=>{view.resize();view.fit();});});
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>button.onclick=()=>{pose=preset(button.dataset.pose!);currentPose=data.find(d=>d.key===button.dataset.pose)?.name||'Стоя';refresh();view.fit();});
document.querySelectorAll<HTMLButtonElement>('[data-display]').forEach(button=>button.onclick=()=>{view.mode=button.dataset.display!;document.querySelectorAll('[data-display]').forEach(b=>b.classList.toggle('selected',b===button));refresh();});
document.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(button=>button.onclick=()=>{view.angle(button.dataset.angle!);document.querySelectorAll('[data-angle]').forEach(b=>b.classList.toggle('selected',b===button));});
document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(button=>button.onclick=()=>{view.controls.mouseButtons.LEFT=button.dataset.tool==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('selected',b===button));});
document.querySelectorAll<HTMLButtonElement>('.fit').forEach(button=>button.onclick=()=>view.fit());document.querySelector<HTMLButtonElement>('.reset')!.onclick=()=>view.angle('¾');
$('grid').onclick=()=>{guideGrid.visible=!guideGrid.visible;$('grid').classList.toggle('selected',guideGrid.visible);view.dirty=true;};
$('projection').onchange=()=>{view.setProjection($<HTMLSelectElement>('projection').value==='perspective');view.fit();};
$('part').onchange=refresh;$('angle').oninput=()=>{pose[$<HTMLSelectElement>('part').value as 'chest'][1]=Number($<HTMLInputElement>('angle').value);refresh();};
$('limits').onclick=()=>{pose.limits=!pose.limits;$('limits').classList.toggle('on',pose.limits);$('limits').setAttribute('aria-checked',String(pose.limits));refresh();};
const reset=()=>{pose=preset('Исходная');currentPose='Стоя';refresh();view.fit();};document.querySelector<HTMLButtonElement>('.reset-pose')!.onclick=reset;document.querySelector<HTMLButtonElement>('.new-pose')!.onclick=reset;
document.querySelector<HTMLButtonElement>('.export-button')!.onclick=async()=>{download(await view.png(),`PoseSketch-${concept}.png`);notice('Референс сохранён в PNG');};
document.querySelector<HTMLButtonElement>('.help-button')!.onclick=()=>notice('Обзор: вращайте фигуру мышью или пальцем. Поза сохраняется.');
const closeDrawer=()=>{shell.classList.remove('show-library','show-inspector');$<HTMLButtonElement>('drawer-dismiss').hidden=true;};
// Keep a single close surface for mobile drawers.
const dismiss=document.querySelector<HTMLButtonElement>('.dismiss-drawer')!;dismiss.id='drawer-dismiss';dismiss.onclick=closeDrawer;
document.querySelector<HTMLButtonElement>('.mobile-menu')!.onclick=()=>{shell.classList.toggle('show-library');shell.classList.remove('show-inspector');dismiss.hidden=!shell.classList.contains('show-library');};
document.querySelectorAll<HTMLButtonElement>('[data-mobile]').forEach(button=>button.onclick=()=>{const panel=button.dataset.mobile;shell.classList.toggle('show-library',panel==='poses');shell.classList.toggle('show-inspector',panel==='properties');dismiss.hidden=panel==='camera';document.querySelectorAll('[data-mobile]').forEach(b=>b.classList.toggle('selected',b===button));});
applyTheme();document.documentElement.dataset.ready='true';
