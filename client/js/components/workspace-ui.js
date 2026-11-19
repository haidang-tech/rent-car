export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const offlineText = 'Chưa kết nối Backend. Dữ liệu chưa được tải; thông tin nhập tại đây không được gửi hoặc lưu.';
export function button(label, target, variant = '') {
  return target ? `<a class="ws-button ${variant}" href="#${escapeHtml(target)}">${escapeHtml(label)}</a>` : `<button type="button" class="ws-button ${variant}" data-action="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}
export function hint(text = offlineText, danger = false) { return `<p class="ws-hint${danger ? ' danger' : ''}">${escapeHtml(text)}</p>`; }
export function emptyState(label = 'Chưa kết nối dữ liệu') {
  return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">▤</span><h3>${escapeHtml(label)}</h3><p>Kết nối dịch vụ để tải thông tin thực tế.<br>Không có bản ghi minh họa trong danh sách này.</p><button class="ws-button secondary" type="button" data-action="Tải lại dữ liệu">Tải lại dữ liệu</button></div>`;
}
export function facts(labels) {
  return `<dl class="ws-facts">${labels.map(label => `<div><dt>${escapeHtml(label)}</dt><dd>Chưa có dữ liệu</dd></div>`).join('')}</dl>`;
}
export function fieldMarkup(field, id) {
  const label = escapeHtml(field.label);
  const common = `id="${id}" name="${id}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''}`;
  let input;
  if (field.type === 'select') input = `<select ${common}><option value="">Chọn ${label.toLocaleLowerCase('vi')}</option>${field.options.map(value => `<option>${escapeHtml(value)}</option>`).join('')}</select>`;
  else if (field.type === 'textarea') input = `<textarea ${common} rows="4" maxlength="2000" placeholder="${escapeHtml(field.placeholder || 'Nhập nội dung')}"></textarea>`;
  else input = `<input ${common} type="${field.type || 'text'}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} ${field.type === 'number' ? 'step="any"' : ''} placeholder="${escapeHtml(field.placeholder || 'Chưa có dữ liệu')}" ${field.type === 'text' ? 'maxlength="150"' : ''}>`;
  return `<div class="ws-field${field.type === 'textarea' ? ' wide' : ''}"><label for="${id}">${label}${field.required ? ' <span aria-hidden="true">*</span>' : ''}${field.suffix ? ` (${escapeHtml(field.suffix)})` : ''}</label>${input}</div>`;
}
export function upload(label, id, required = false) {
  return `<div class="upload-field"><label for="${id}"><span class="upload-symbol" aria-hidden="true">↑</span><strong>${escapeHtml(label)}</strong><span>Chọn ảnh · JPG, PNG, WebP · tối đa 5 MB/ảnh</span></label><input id="${id}" name="${id}" type="file" accept="image/jpeg,image/png,image/webp" ${required ? 'required' : ''}><div class="file-preview" aria-live="polite"></div></div>`;
}
export function filters(labels) {
  return `<div class="filter-tabs" role="group" aria-label="Lọc theo trạng thái">${labels.map((label, i) => `<button type="button" data-filter="${escapeHtml(label)}" aria-pressed="${i === 0}">${escapeHtml(label)}</button>`).join('')}</div>`;
}
export function searchBox() {
  return `<div class="table-search"><label class="search-input"><span aria-hidden="true">⌕</span><span class="sr-only">Tìm theo mã, tên hoặc thông tin liên quan</span><input type="search" data-search placeholder="Tìm theo mã, tên hoặc thông tin liên quan" maxlength="150"></label><span class="result-count" role="status">Chưa tải dữ liệu</span></div>`;
}
export function steps(labels, interactive = false) {
  return `<ol class="workflow-steps${interactive ? ' interactive' : ''}">${labels.map((label, i) => `<li${i === 0 ? ' class="current"' : ''}>${interactive ? `<button type="button" data-step="${i}" aria-pressed="${i === 0}">` : ''}<span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(label)}${interactive ? '</button>' : ''}</li>`).join('')}</ol>`;
}
export function panelAside(screen) {
  return `<aside class="ws-card aside-card"><h2>${escapeHtml(screen.aside || 'Thông tin liên quan')}</h2><p class="subtle">Chưa chọn bản ghi từ hệ thống.</p>${facts(screen.facts || [])}<div class="aside-actions">${(screen.links || []).map(([label, key]) => button(label, key)).join('')}${(screen.actions || []).map(label => button(label, null, 'secondary')).join('')}${screen.parent ? button('Về danh sách', screen.parent, 'secondary') : ''}</div></aside>`;
}
export function operationsScreen(screen) {
  if (screen.kind === 'calendar') return `<section class="ws-card calendar-card"><div class="calendar-toolbar"><h2 id="calendar-label">Lịch theo tuần</h2><div class="calendar-controls"><button class="ws-button secondary" data-week="-1" aria-label="Tuần trước">‹</button><label class="ws-field">Tuần có ngày<input type="date" id="calendar-date" aria-label="Chọn ngày xem lịch"></label><button class="ws-button secondary" data-week="1" aria-label="Tuần sau">›</button><button class="ws-button secondary" data-today>Hôm nay</button></div></div><div class="table-scroll" tabindex="0" role="region" aria-label="Lịch điều phối theo tuần"><table class="calendar-table"><thead id="calendar-head"></thead><tbody><tr><td colspan="8">${emptyState('Chưa tải lịch phương tiện')}</td></tr></tbody></table></div>${hint('Chọn đơn chưa xếp, kiểm tra xe còn trống rồi xác nhận phân bổ khi hệ thống đã kết nối.')}</section><section class="ws-card unassigned"><h2>Đơn chưa xếp xe</h2><p>Chưa tải danh sách đơn thuê.</p>${button('Chọn xe còn trống')}</section>`;
  const body = screen.kind === 'table'
    ? `<section class="ws-card table-card">${filters(screen.filters)}${searchBox()}<div class="table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(screen.title)}"><table><thead><tr>${screen.columns.map(column => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody><tr><td colspan="${screen.columns.length}">${emptyState()}</td></tr></tbody></table></div></section>`
    : `<form class="ws-card editor-form" data-offline-form><div class="card-heading"><h2>${escapeHtml(screen.heading)}</h2><span class="badge">Chưa kết nối</span></div>${screen.steps ? steps(screen.steps, true) : ''}<div class="form-grid">${screen.fields.map((field, i) => fieldMarkup(field, `field-${i}`)).join('')}</div>${screen.upload ? upload(screen.upload, 'attachment') : ''}${hint(screen.hint || offlineText)}<div class="form-actions"><button class="ws-button" type="submit">${escapeHtml(screen.submit)}</button></div><p class="form-feedback" role="status" hidden></p></form>`;
  return `<div class="operations-grid">${body}${panelAside(screen)}</div>`;
}
