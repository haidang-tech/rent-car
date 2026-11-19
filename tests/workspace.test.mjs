import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { access, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { workspaces, resolveScreen } from '../client/js/pages/workspace-config.js';

let fixtureId = 0;
async function fixture(role) {
  const window = new Window({ url: `http://localhost:4173/pages/${role}.html`, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableComputedStyleRendering: true } });
  window.document.body.className = `workspace ${role}`;
  window.document.body.dataset.workspace = role;
  window.document.body.innerHTML = '<div id="workspace"></div>';
  for (const key of ['window', 'document', 'location', 'Image']) globalThis[key] = key === 'window' ? window : window[key];
  await import(`../client/js/pages/workspace.js?test=${fixtureId++}`);
  async function route(key) {
    window.location.hash = key;
    await window.happyDOM.whenAsyncComplete();
  }
  return { window, document: window.document, route, close: () => window.happyDOM.abort() };
}

test('All 30 design screens render with valid navigation, unique IDs and associated input labels', async () => {
  let count = 0;
  for (const [role, config] of Object.entries(workspaces)) {
    const f = await fixture(role);
    for (const [key, screen] of Object.entries(config.screens)) {
      await f.route(key);
      assert.ok(f.document.title.includes(screen.title), `${role}/${key}: title`);
      assert.ok(f.document.querySelector('main h1'), `${role}/${key}: heading`);
      const ids = [...f.document.querySelectorAll('[id]')].map(node => node.id);
      assert.equal(ids.length, new Set(ids).size, `${role}/${key}: duplicate IDs`);
      for (const link of f.document.querySelectorAll('a[href^="#"]')) {
        const hash = link.getAttribute('href').slice(1);
        assert.ok(hash === 'main' || Object.hasOwn(config.screens, hash), `${role}/${key}: broken route ${hash}`);
      }
      for (const input of f.document.querySelectorAll('input,select,textarea')) {
        assert.ok(input.getAttribute('aria-label') || input.labels?.length, `${role}/${key}: unlabeled ${input.outerHTML}`);
      }
      for (const image of f.document.querySelectorAll('img')) {
        assert.ok(image.getAttribute('alt'));
        await access(resolve('client/pages', image.getAttribute('src')));
      }
      count++;
    }
    await f.close();
  }
  assert.equal(count, 30);
});
test('Four HTML entry points resolve all styles and module resources', async () => {
  for (const role of Object.keys(workspaces)) {
    const file = resolve(`client/pages/${role}.html`);
    const content = await readFile(file, 'utf8');
    for (const [, reference] of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!reference.startsWith('#')) await access(resolve(dirname(file), reference));
    }
  }
});
test('Unknown routes safely return to the correct workspace default', () => {
  for (const [role, config] of Object.entries(workspaces)) {
    assert.equal(resolveScreen(role, '#not-found').key, config.default);
    assert.equal(resolveScreen(role, '#__proto__').key, config.default);
  }
});
test('Operations: filters, search, modal validation and offline submission', async () => {
  const f = await fixture('admin');
  f.document.querySelector('[data-filter="Sẵn sàng"]').click();
  assert.equal(f.document.querySelector('[data-filter="Sẵn sàng"]').getAttribute('aria-pressed'), 'true');
  const search = f.document.querySelector('[data-search]');
  search.value = '<img src=x onerror=alert(1)>';
  search.dispatchEvent(new f.window.Event('input', { bubbles: true }));
  assert.ok(f.document.querySelector('.result-count').textContent.includes('Chưa kết nối'));
  assert.equal(f.document.querySelectorAll('.table-card img').length, 0);
  await f.route('employees');
  f.document.querySelector('[data-action="Thêm nhân viên"]').click();
  assert.equal(f.document.querySelector('#action-dialog').open, true);
  const form = f.document.querySelector('#action-dialog form');
  assert.equal(form.checkValidity(), false);
  form.querySelectorAll('input').forEach(input => { input.value = input.type === 'email' ? 'test@example.test' : 'UI test'; });
  form.dispatchEvent(new f.window.Event('submit', { bubbles: true, cancelable: true }));
  assert.ok(form.querySelector('.form-feedback').textContent.includes('không được gửi hoặc lưu'));
  f.document.querySelector('#action-dialog [data-close]').click();
  assert.equal(f.document.querySelector('#action-dialog').open, false);
  await f.close();
});
test('Calendar controls advance by a week and return to today', async () => {
  const f = await fixture('admin');
  await f.route('schedule');
  const before = f.document.querySelector('#calendar-date').value;
  f.document.querySelector('[data-week="1"]').click();
  const after = f.document.querySelector('#calendar-date').value;
  assert.equal((new Date(after) - new Date(before)) / 86400000, 7);
  assert.equal(f.document.querySelectorAll('#calendar-head th').length, 8);
  f.document.querySelector('[data-today]').click();
  assert.equal(f.document.querySelector('#calendar-date').value, before);
  await f.close();
});
test('Customer: extension dates, agreement gate, payment selection and rating are interactive', async () => {
  const f = await fixture('customer');
  await f.route('extension');
  const current = f.document.querySelector('#current-return');
  current.value = '2026-12-31T10:00';
  f.document.querySelector('[data-days="2"]').click();
  const next = f.document.querySelector('#new-return');
  assert.equal(next.value, '2027-01-02T10:00');
  next.value = '2026-12-30T10:00';
  next.dispatchEvent(new f.window.Event('input', { bubbles: true }));
  assert.equal(next.checkValidity(), false);
  await f.route('contract');
  assert.equal(f.document.querySelector('#sign-contract').disabled, true);
  f.document.querySelector('#contract-consent').click();
  assert.equal(f.document.querySelector('#sign-contract').disabled, false);
  f.document.querySelector('#sign-contract').click();
  assert.ok(f.document.querySelector('.form-feedback').textContent.includes('Chưa kết nối'));
  await f.route('payment');
  f.document.querySelector('.choice input').click();
  assert.equal(f.document.querySelector('.choice input').checked, true);
  await f.route('review');
  f.document.querySelector('input[name="rating-0"][value="4"]').click();
  f.document.querySelector('input[name="rating-1"][value="5"]').click();
  assert.equal(f.document.querySelectorAll('.rating input:checked').length, 2);
  await f.close();
});
test('Sensitive operations show offline notice and do not create transaction records', async () => {
  const f = await fixture('accountant');
  const trigger = f.document.querySelector('[data-action="Ký duyệt hợp đồng"]');
  trigger.click();
  assert.equal(f.document.querySelector('#notice-dialog').open, true);
  assert.match(f.document.querySelector('#notice-text').textContent, /Không có thay đổi nào/);
  f.document.querySelector('#notice-dialog [data-close]').click();
  assert.equal(f.document.querySelector('#notice-dialog').open, false);
  assert.equal(f.document.querySelectorAll('tbody tr').length, 1);
  await f.close();
});
