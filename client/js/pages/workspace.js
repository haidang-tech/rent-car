import { workspaces, resolveScreen } from './workspace-config.js';
import { operationsScreen, escapeHtml as esc, button, fieldMarkup, hint, offlineText } from '../components/workspace-ui.js';
import { customerScreen } from './customer-views.js';
import { localDate } from './validation.js';

const role = document.body.dataset.workspace;
const config = workspaces[role];
const app = document.querySelector('#workspace');
const objectUrls = new Set();
let currentKey;
let weekDate = new Date();
const icons = ['☷', '▱', '▣', '▤', '▱', '◷', '⇄', '⊗', '△', '☆'];
const actionFields = {
  'Thêm quy tắc giá': ['Tên quy tắc', 'Phạm vi áp dụng', 'Đơn giá / phụ thu', 'Ngày bắt đầu', 'Ngày kết thúc'],
  'Thêm nhân viên': ['Họ tên', 'Email', 'Vai trò', 'Cơ sở'],
  'Thêm địa điểm': ['Tên địa điểm', 'Loại điểm', 'Địa chỉ', 'Phạm vi'],
  'Lập lệnh bảo dưỡng': ['Biển số', 'Hạng mục', 'Phụ trách', 'Dự toán'],
  'Ghi nhận sự cố': ['Mã đơn thuê', 'Biển số', 'Phân loại', 'Mô tả'],
  'Nhập biên bản': ['Biển số', 'Thời điểm vi phạm', 'Nguồn thông báo', 'Nội dung biên bản']
};

function roleSwitch() {
  return `<div class="preview-bar"><p>Giao diện chưa kết nối · Không có dữ liệu tài khoản hoặc giao dịch thực tế.</p><label class="preview-switch" for="workspace-switch">Xem giao diện<select id="workspace-switch">${Object.entries(workspaces).map(([key, value]) => `<option value="${key}"${key === role ? ' selected' : ''}>${esc(value.label)}</option>`).join('')}</select></label></div>`;
}
function navMarkup(key) {
  const screen = config.screens[key];
  return config.nav.map(([target, label]) => `<a href="#${target}"${target === key || target === screen.parent ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
}
function customerSidebar(key) {
  return `<aside class="customer-sidebar"><div class="customer-profile"><span class="avatar" aria-hidden="true">L</span><div><strong>Khách hàng</strong><small>Chưa kết nối tài khoản</small></div></div><nav aria-label="Chuyến thuê và thủ tục">${config.nav.map(([target, label], i) => `${({ 0: '<p class="sidebar-group">CHUYẾN THUÊ</p>', 2: '<p class="sidebar-group">THỦ TỤC</p>', 5: '<p class="sidebar-group">ĐIỀU CHỈNH</p>', 8: '<p class="sidebar-group">HỖ TRỢ</p>' })[i] || ''}<a href="#${target}"${key === target ? ' aria-current="page"' : ''}><span aria-hidden="true">${icons[i]}</span>${esc(label)}</a>`).join('')}</nav></aside>`;
}
function releasePreviews() { objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls.clear(); }
function render(focus = false) {
  releasePreviews();
  const { key } = resolveScreen(role, location.hash);
  currentKey = key;
  const screen = config.screens[key];
  document.title = `${screen.title} · Lái Đi / ${config.label}`;
  const top = `<header class="ws-topbar"><a class="ws-brand" href="../index.html">${role === 'customer' ? '<span class="brand-mark" aria-hidden="true">L</span>Lái Đi' : `Lái Đi / ${esc(config.label)}`}</a>${role === 'customer' ? '<form class="search-input" id="header-search"><label class="sr-only" for="global-search">Tìm chuyến thuê</label><span aria-hidden="true">⌕</span><input id="global-search" type="search" placeholder="Tìm theo mã đơn, tên xe…" maxlength="150"></form>' : ''}<div class="topbar-meta"><span>Đà Nẵng</span><span>·</span><a href="../index.html">Trang chủ</a></div></header>${roleSwitch()}`;
  const content = role === 'customer'
    ? `${customerSidebar(key)}<div class="customer-body">${key === 'trips' ? '' : `<div class="page-heading">${button('‹ Quay lại', 'trips', 'secondary')}</div>`}${customerScreen(key, screen)}</div>`
    : `<div class="page-heading"><h1 tabindex="-1">${esc(screen.title)}</h1>${screen.primary ? button(...screen.primary) : screen.parent ? button('Quay lại', screen.parent, 'secondary') : ''}</div>${operationsScreen(screen)}`;
  app.innerHTML = `${top}${role === 'customer' ? '' : `<nav class="ws-nav" aria-label="Chức năng ${esc(config.label)}">${navMarkup(key)}</nav>`}<main class="workspace-main" id="main">${content}</main><dialog class="workspace-dialog" id="action-dialog" aria-labelledby="action-title"><button class="modal-close" data-close aria-label="Đóng hộp thoại">×</button><h2 id="action-title"></h2><div id="action-content"></div></dialog><dialog class="notice-dialog" id="notice-dialog" aria-labelledby="notice-title"><h2 id="notice-title">Chưa kết nối dịch vụ</h2><p id="notice-text"></p><button class="ws-button" data-close>Đóng</button></dialog>`;
  if (key === 'schedule') updateCalendar();
  if (focus) { const title = app.querySelector('main h1'); title?.setAttribute('tabindex', '-1'); title?.focus({ preventScroll: true }); window.scrollTo(0, 0); }
}
function openDialog(dialog, trigger = document.activeElement) {
  dialog.showModal();
  dialog.addEventListener('close', () => { if (trigger?.isConnected) trigger.focus(); }, { once: true });
}
function notify(message = offlineText, trigger) {
  document.querySelector('#notice-text').textContent = message;
  openDialog(document.querySelector('#notice-dialog'), trigger);
}
function openAction(name, trigger) {
  if (name === 'Khám phá đội xe') { location.href = '../index.html#doi-xe'; return; }
  const labels = actionFields[name];
  if (!labels) { notify(`${name}: chưa có dữ liệu hoặc dịch vụ kết nối để thực hiện. Không có thay đổi nào được gửi hoặc lưu.`, trigger); return; }
  document.querySelector('#action-title').textContent = name;
  document.querySelector('#action-content').innerHTML = `<form data-offline-form><div class="form-grid">${labels.map((label, i) => fieldMarkup({ label, required: true, type: label.startsWith('Ngày') ? 'date' : label === 'Email' ? 'email' : label === 'Mô tả' || label === 'Nội dung biên bản' ? 'textarea' : 'text' }, `action-field-${i}`)).join('')}</div>${hint()}<button class="ws-button" type="submit">Lưu thông tin</button><p class="form-feedback" role="status" hidden></p></form>`;
  openDialog(document.querySelector('#action-dialog'), trigger);
}
function updateCalendar() {
  const monday = new Date(weekDate.getFullYear(), weekDate.getMonth(), weekDate.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const dates = Array.from({ length: 7 }, (_, i) => { const day = new Date(monday); day.setDate(day.getDate() + i); return day; });
  const format = date => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  document.querySelector('#calendar-label').textContent = `Tuần ${format(dates[0])} – ${format(dates[6])} / ${dates[6].getFullYear()}`;
  document.querySelector('#calendar-date').value = localDate(weekDate);
  document.querySelector('#calendar-head').innerHTML = `<tr><th scope="col">Phương tiện</th>${dates.map((date, i) => `<th scope="col">${i < 6 ? `T${i + 2}` : 'CN'} ${format(date)}</th>`).join('')}</tr>`;
}
function validateExtension(form) {
  const before = form.querySelector('#current-return');
  const after = form.querySelector('#new-return');
  if (!before || !after) return;
  after.min = before.value;
  after.setCustomValidity(before.value && after.value && after.value <= before.value ? 'Thời gian trả mới phải sau thời gian trả hiện có.' : '');
}
app.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-close')) { target.closest('dialog').close(); return; }
  if (target.dataset.action) { openAction(target.dataset.action, target); return; }
  if (target.hasAttribute('data-filter')) {
    target.parentElement.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === target)));
    target.closest('.table-card').querySelector('.result-count').textContent = `Bộ lọc: ${target.dataset.filter} · Chưa tải dữ liệu`;
  }
  if (target.hasAttribute('data-step')) {
    target.closest('ol').querySelectorAll('li').forEach(item => { const active = item.contains(target); item.classList.toggle('current', active); item.querySelector('button').setAttribute('aria-pressed', String(active)); });
    const feedback = target.closest('form').querySelector('.form-feedback');
    feedback.hidden = false; feedback.textContent = 'Đang xem bước ' + (Number(target.dataset.step) + 1) + '. Chưa có hồ sơ thực tế để thực hiện bước này.';
  }
  if (target.hasAttribute('data-week')) { weekDate.setDate(weekDate.getDate() + Number(target.dataset.week) * 7); updateCalendar(); }
  if (target.hasAttribute('data-today')) { weekDate = new Date(); updateCalendar(); }
  if (target.hasAttribute('data-days')) {
    const before = document.querySelector('#current-return');
    if (!before.value) { before.reportValidity(); before.focus(); return; }
    const newDate = new Date(before.value);
    newDate.setDate(newDate.getDate() + Number(target.dataset.days));
    document.querySelector('#new-return').value = `${localDate(newDate)}T${String(newDate.getHours()).padStart(2, '0')}:${String(newDate.getMinutes()).padStart(2, '0')}`;
    target.parentElement.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === target)));
    validateExtension(target.closest('form'));
  }
});
app.addEventListener('input', event => {
  const target = event.target;
  if (target.hasAttribute('data-search')) {
    target.closest('.table-card').querySelector('.result-count').textContent = target.value.trim() ? 'Chưa kết nối tìm kiếm dữ liệu' : 'Chưa tải dữ liệu';
  }
  if (target.id === 'current-return' || target.id === 'new-return') {
    validateExtension(target.closest('form'));
    document.querySelectorAll('[data-days]').forEach(item => item.setAttribute('aria-pressed', 'false'));
  }
});
app.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'workspace-switch' && Object.hasOwn(workspaces, target.value)) location.href = `${target.value}.html`;
  if (target.id === 'calendar-date' && target.value) { weekDate = new Date(target.value + 'T12:00'); updateCalendar(); }
  if (target.id === 'contract-consent') document.querySelector('#sign-contract').disabled = !target.checked;
  if (target.type === 'file') {
    const preview = target.parentElement.querySelector('.file-preview');
    const old = preview.dataset.url;
    if (old) { URL.revokeObjectURL(old); objectUrls.delete(old); delete preview.dataset.url; }
    preview.replaceChildren(); target.setCustomValidity('');
    const file = target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        target.value = ''; target.setCustomValidity('Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.');
        preview.textContent = 'Ảnh không hợp lệ. Vui lòng chọn lại.'; target.reportValidity();
      } else {
        const url = URL.createObjectURL(file); objectUrls.add(url); preview.dataset.url = url;
        const image = new Image(); image.src = url; image.alt = `Xem trước ${file.name}`;
        const label = document.createElement('p'); label.textContent = file.name + ' · Chỉ xem trên thiết bị';
        preview.append(image, label);
      }
    }
    if (currentKey === 'identity') {
      const count = [...document.querySelectorAll('.identity-grid input')].filter(input => input.files.length).length;
      document.querySelector('#identity-progress').value = count;
      document.querySelector('#identity-count').textContent = `${count}/4`;
    }
  }
});
app.addEventListener('submit', event => {
  event.preventDefault();
  if (event.target.id === 'header-search') { notify('Chưa kết nối dữ liệu chuyến thuê để tìm kiếm.'); return; }
  if (!event.target.hasAttribute('data-offline-form')) return;
  validateExtension(event.target);
  if (!event.target.reportValidity()) return;
  const feedback = event.target.querySelector('.form-feedback');
  feedback.textContent = 'Biểu mẫu đã được kiểm tra trên thiết bị. ' + offlineText;
  feedback.hidden = false;
});
app.addEventListener('click', event => {
  if (event.target.tagName !== 'DIALOG') return;
  const bounds = event.target.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#main') { const main = document.querySelector('#main'); main.tabIndex = -1; main.focus(); return; }
  render(true);
});
window.addEventListener('pagehide', releasePreviews);
render();
