export function initHeader() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng');
    nav.classList.toggle('is-open', open);
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
  matchMedia('(min-width: 801px)').addEventListener('change', () => setOpen(false));
}
