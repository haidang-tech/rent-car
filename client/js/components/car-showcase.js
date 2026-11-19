// Presentation content transcribed from Figma/landing.png, NOT live inventory.
const designCars = [
  { name: 'VF 5', type: 'SUV đô thị', seats: '5 chỗ', price: '690.000 ₫', image: 'vf5', color: 'bạc' },
  { name: 'VF 6', type: 'SUV cỡ B', seats: '5 chỗ', price: '890.000 ₫', image: 'vf6', color: 'xanh' },
  { name: 'VF MPV 7', type: 'MPV gia đình', seats: '7 chỗ', price: '1.090.000 ₫', image: 'vfmpv7', color: 'bạc' }
];
export function initShowcase(onChoose) {
  let selected = 0;
  const tabs = [...document.querySelectorAll('[data-car]')];
  function select(index, focus = false) {
    selected = (index + designCars.length) % designCars.length;
    const car = designCars[selected];
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === selected)); tab.tabIndex = i === selected ? 0 : -1; });
    document.querySelector('#car-panel').setAttribute('aria-labelledby', tabs[selected].id);
    const image = document.querySelector('#car-image');
    image.src = `assets/images/${car.image}.png`;
    image.alt = `VinFast ${car.name} màu ${car.color}, nhìn từ bên hông`;
    document.querySelector('#car-type').textContent = car.type;
    document.querySelector('#car-seats').textContent = car.seats;
    document.querySelector('#car-price').textContent = car.price;
    if (focus) tabs[selected].focus();
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  document.querySelector('.car-tabs').addEventListener('keydown', event => {
    const actions = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: designCars.length - 1 };
    if (Object.hasOwn(actions, event.key)) { event.preventDefault(); select(actions[event.key], true); }
  });
  document.querySelector('.prev').addEventListener('click', () => select(selected - 1));
  document.querySelector('.next').addEventListener('click', () => select(selected + 1));
  document.querySelector('#choose-car').addEventListener('click', () => onChoose(designCars[selected].name));
}
