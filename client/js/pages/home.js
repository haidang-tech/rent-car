import { unavailableMessages } from '../api.js';
import { initShowcase } from '../components/car-showcase.js';
import { localDate, nextDate, validateDates } from './validation.js';
export function initHome() {
  const pickup = document.querySelector('#pickup-date');
  const dropoff = document.querySelector('#return-date');
  const status = document.querySelector('#search-status');
  let chosenCar = '';
  const showStatus = message => { status.hidden = false; status.textContent = message; };
  function updateDates() {
    pickup.min = localDate();
    dropoff.min = pickup.value && pickup.value >= pickup.min ? nextDate(pickup.value) : nextDate(pickup.min);
    dropoff.setCustomValidity(dropoff.value && pickup.value ? validateDates(pickup.value, dropoff.value) : '');
  }
  updateDates();
  [pickup, dropoff].forEach(input => input.addEventListener('input', () => { updateDates(); status.hidden = true; }));
  document.querySelector('#search-form').addEventListener('submit', event => {
    event.preventDefault();
    updateDates();
    if (!event.target.reportValidity()) return;
    const error = validateDates(pickup.value, dropoff.value);
    showStatus(error || `${chosenCar ? `Mẫu đang xem: ${chosenCar}. ` : ''}${unavailableMessages.search}`);
  });
  function focusSearch() {
    document.querySelector('#tim-xe').scrollIntoView({ block: 'start' });
    pickup.focus({ preventScroll: true });
  }
  initShowcase(name => { chosenCar = name; showStatus(`Đã chọn mẫu tham khảo ${name}. Chọn ngày để tiếp tục. Dịch vụ tìm xe chưa được kết nối.`); focusSearch(); });
  document.querySelectorAll('[data-location]').forEach(button => button.addEventListener('click', () => {
    document.querySelector('#location').value = button.dataset.location;
    status.hidden = true;
    focusSearch();
  }));
  const loginForm = document.querySelector('#login-form');
  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    document.querySelector('#login-status').textContent = unavailableMessages.login;
    loginForm.reset();
  });
  document.querySelector('#login-modal').addEventListener('close', () => loginForm.reset());
}
