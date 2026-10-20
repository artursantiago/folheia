// The extension's own screen: the list of approved sites, and the approval
// asked for by Folheia ("request-access"). Granting is a browser permission
// prompt, which needs a click here; a page can never grant itself access.
import { DEV_MATCHES, FOLHEIA_MATCHES, toPermissionPattern } from './patterns';
import { api } from './webext';

const t = (name: string, substitutions?: string) => api.i18n.getMessage(name, substitutions);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]'))
  element.textContent = t(element.dataset.i18n ?? '');
document.documentElement.lang = t('@@ui_locale').replace('_', '-');

const status = $<HTMLParagraphElement>('status');

function item(pattern: string, action?: HTMLButtonElement) {
  const li = document.createElement('li');
  const code = document.createElement('code');
  code.textContent = pattern;
  li.append(code);
  if (action) li.append(action);
  return li;
}

async function render() {
  const { origins = [] } = await api.permissions.getAll();
  // The pages the bridge runs on show up as origins too; they aren't destinations.
  const pages = [...FOLHEIA_MATCHES, ...DEV_MATCHES];
  const approved = origins.filter((origin) => !pages.includes(origin)).sort();
  const list = $<HTMLUListElement>('approved');
  list.replaceChildren(
    ...approved.map((pattern) => {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = t('remove');
      remove.addEventListener('click', async () => {
        const removed = await api.permissions.remove({ origins: [pattern] }).catch(() => false);
        status.textContent = removed ? '' : t('cannotRemove');
        await render();
      });
      return item(pattern, remove);
    }),
  );
  if (!approved.length) {
    const li = document.createElement('li');
    li.textContent = t('none');
    list.append(li);
  }
}

async function grant(patterns: string[]) {
  // request() must run straight from the click, before any other await.
  const granted = await api.permissions.request({ origins: patterns }).catch(() => false);
  status.textContent = granted ? t('granted') : t('denied');
  await render();
  return granted;
}

const requested = (new URLSearchParams(location.search).get('request') ?? '')
  .split(' ')
  .map((value) => toPermissionPattern(value))
  .filter((pattern): pattern is string => Boolean(pattern));
if (requested.length) {
  $('request').hidden = false;
  $<HTMLUListElement>('requested').replaceChildren(...requested.map((pattern) => item(pattern)));
  $<HTMLButtonElement>('allow').addEventListener('click', async () => {
    if (await grant(requested)) $('request').hidden = true;
  });
}

$<HTMLFormElement>('add').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>('site');
  const pattern = toPermissionPattern(input.value);
  if (!pattern) {
    status.textContent = t('invalid');
    return;
  }
  void grant([pattern]).then((granted) => {
    if (granted) input.value = '';
  });
});

void render();
