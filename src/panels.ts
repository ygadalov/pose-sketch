const preferenceKey = 'posesketch-panels-v2';
type Panel = 'workshop' | 'editor';
type Preferences = Record<Panel, boolean>;

/** The same edge controls work at every viewport width, including a phone's desktop-site mode. */
export function initPanels() {
  const drawers = window.matchMedia('(max-width: 850px)');
  const preferences: Preferences = {workshop: !drawers.matches, editor: !drawers.matches};
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || 'null');
    for (const name of ['workshop', 'editor'] as const) {
      if (typeof saved?.[name] === 'boolean') preferences[name] = saved[name];
    }
  } catch { /* The workspace also works without browser storage. */ }

  const layout = document.querySelector<HTMLElement>('.studio-layout')!;
  const workspace=document.querySelector<HTMLElement>('.workspace')!;
  const backdrop = document.getElementById('panel-backdrop')!;
  const controls = {
    workshop: {panel: document.getElementById('workshop-panel')!, shell: document.getElementById('workshop-shell')!, button: document.getElementById('toggle-workshop')!, label: 'мастерскую'},
    editor: {panel: document.getElementById('editor-panel')!, shell: document.getElementById('editor-shell')!, button: document.getElementById('toggle-editor')!, label: 'редактор поз'},
  };
  const store = () => {
    try {localStorage.setItem(preferenceKey, JSON.stringify(preferences));} catch { /* Optional preference. */ }
  };

  function update() {
    // Two drawers must never cover each other's close buttons on a small screen.
    if (drawers.matches && preferences.workshop && preferences.editor) {
      preferences.workshop = false;
      preferences.editor = false;
    }
    for (const name of ['workshop', 'editor'] as const) {
      const {panel, shell, button, label} = controls[name];
      const expanded = preferences[name];
      panel.hidden = !expanded;
      shell.dataset.collapsed = String(!expanded);
      layout.classList.toggle(`${name}-collapsed`, !expanded);
      button.setAttribute('aria-expanded', String(expanded));
      const action = `${expanded ? 'Скрыть' : 'Показать'} ${label}`;
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
      button.querySelector('.panel-arrow')!.textContent = name === 'workshop' ? (expanded ? '<' : '>') : (expanded ? '>' : '<');
    }
    backdrop.hidden = !drawers.matches || (!preferences.workshop && !preferences.editor);
    workspace.inert=!backdrop.hidden;
    document.body.classList.toggle('workspace-only', !preferences.workshop && !preferences.editor);
  }
  for (const name of ['workshop', 'editor'] as const) {
    controls[name].button.addEventListener('click', () => {
      preferences[name] = !preferences[name];
      if (drawers.matches && preferences[name]) preferences[name === 'workshop' ? 'editor' : 'workshop'] = false;
      update();store();
    });
  }
  function closeDrawers(){
    const previous=preferences.editor?'editor':'workshop';
    preferences.workshop=false;preferences.editor=false;update();store();
    controls[previous].button.focus({preventScroll:true});
  }
  backdrop.addEventListener('click', closeDrawers);
  document.addEventListener('keydown', event => {
    if(document.querySelector<HTMLDialogElement>('#help-dialog')?.open)return;
    if(!drawers.matches||backdrop.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDrawers();}
    if(event.key==='Tab'){
      const name=preferences.editor?'editor':'workshop',other=name==='editor'?'workshop':'editor';
      const fields=Array.from(controls[name].shell.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')).filter(el=>!el.closest('[hidden]')&&el.getClientRects().length>0);
      fields.push(controls[other].button);
      const index=fields.indexOf(document.activeElement as HTMLElement),next=index<0?0:(index+(event.shiftKey?-1:1)+fields.length)%fields.length;
      event.preventDefault();fields[next]?.focus();
    }
  });
  drawers.addEventListener('change', update);
  update();
}
