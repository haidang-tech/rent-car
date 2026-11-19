export function initModals() {
  document.querySelectorAll('[data-modal]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.modal);
      dialog.showModal();
      dialog.addEventListener('close', () => button.focus(), { once: true });
    });
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  });
}
