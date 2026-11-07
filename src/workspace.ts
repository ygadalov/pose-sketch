/** Reserve the actual toolbar height instead of a fixed mobile/desktop guess. */
export function initWorkspaceSizing(){
  const workspace=document.querySelector<HTMLElement>('.workspace')!;
  const cameraBar=document.querySelector<HTMLElement>('.camera-bar')!;
  const displayBar=document.querySelector<HTMLElement>('.viewport-top')!;
  const hints=document.querySelector<HTMLElement>('.canvas-help')!;
  const update=()=>{
    const height=Math.ceil(workspace.getBoundingClientRect().bottom-cameraBar.getBoundingClientRect().top+12);
    workspace.style.setProperty('--scene-bottom',`${height}px`);
    workspace.style.setProperty('--scene-top',`${Math.ceil(displayBar.getBoundingClientRect().bottom-workspace.getBoundingClientRect().top+12)}px`);
  };
  const observer=new ResizeObserver(update);observer.observe(workspace);observer.observe(cameraBar);observer.observe(displayBar);
  const touch=matchMedia('(pointer: coarse)');
  const updateHints=()=>{hints.textContent=touch.matches?'1 палец — вращение · 2 пальца — масштаб и сдвиг':'Тяните сцену — вращение · Колёсико — масштаб · Правая кнопка — сдвиг';};
  touch.addEventListener('change',updateHints);updateHints();update();
}
