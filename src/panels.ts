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
    document.body.classList.toggle('workspace-only', !preferences.workshop && !preferences.editor);
  }
  for (const name of ['workshop', 'editor'] as const) {
    controls[name].button.addEventListener('click', () => {
      preferences[name] = !preferences[name];
      if (drawers.matches && preferences[name]) preferences[name === 'workshop' ? 'editor' : 'workshop'] = false;
      update();store();
    });
  }
  backdrop.addEventListener('click', () => {
    preferences.workshop = false;preferences.editor = false;update();store();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawers.matches && !backdrop.hidden) {
      preferences.workshop = false;preferences.editor = false;update();store();
    }
  });
  drawers.addEventListener('change', update);
  update();
}
