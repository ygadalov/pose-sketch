const preferenceKey = 'posesketch-panels-v1';
const mobileQuery = '(max-width: 700px), (min-width: 520px) and (max-width: 950px) and (max-height: 550px)';
type Panel = 'workshop' | 'editor';
type Preferences = Record<Panel, boolean>;

/** Panel visibility belongs to the workspace UI, never to pose files or undo history. */
export function initMobilePanels() {
  const media = window.matchMedia(mobileQuery);
  const preferences: Preferences = {workshop: true, editor: true};
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || 'null');
    for (const name of ['workshop', 'editor'] as const) {
      if (typeof saved?.[name] === 'boolean') preferences[name] = saved[name];
    }
  } catch { /* Optional UI preferences must not prevent opening the editor. */ }

  const controls = {
    workshop: {panel: document.getElementById('workshop-panel')!, button: document.getElementById('toggle-workshop')!, label: 'мастерскую'},
    editor: {panel: document.getElementById('editor-panel')!, button: document.getElementById('toggle-editor')!, label: 'редактор поз'},
  };

  function update() {
    for (const name of ['workshop', 'editor'] as const) {
      const {panel, button, label} = controls[name];
      const expanded = !media.matches || preferences[name];
      panel.hidden = !expanded;
      button.setAttribute('aria-expanded', String(expanded));
      const action = `${expanded ? 'Скрыть' : 'Показать'} ${label}`;
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
    }
    document.body.classList.toggle('mobile-workspace-only', media.matches && !preferences.workshop && !preferences.editor);
  }

  for (const name of ['workshop', 'editor'] as const) {
    controls[name].button.addEventListener('click', () => {
      if (!media.matches) return;
      preferences[name] = !preferences[name];
      try {localStorage.setItem(preferenceKey, JSON.stringify(preferences));} catch { /* Keep working without persistence. */ }
      update();
    });
  }
  media.addEventListener('change', update);
  update();
}
