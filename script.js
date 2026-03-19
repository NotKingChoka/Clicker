const STORAGE_KEY = "larisa-clicker-save-v1";

const DEFAULT_STATE = Object.freeze({
  coins: 0,
  clickPower: 1,
  autoClickers: 0,
  clickUpgradeLevel: 0,
  clickUpgradePrice: 50,
  autoUpgradePrice: 120
});

const elements = {
  coins: document.getElementById("coins"),
  coinsPerClick: document.getElementById("coinsPerClick"),
  autoClickers: document.getElementById("autoClickers"),
  clickLevel: document.getElementById("clickLevel"),
  autoLevel: document.getElementById("autoLevel"),
  clickPrice: document.getElementById("clickPrice"),
  autoPrice: document.getElementById("autoPrice"),
  clickTarget: document.getElementById("clickTarget"),
  targetPhoto: document.getElementById("targetPhoto"),
  buyClickPower: document.getElementById("buyClickPower"),
  buyAutoClicker: document.getElementById("buyAutoClicker"),
  resetProgress: document.getElementById("resetProgress")
};

let state = loadState();

function toSafeInt(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.floor(number));
}

function sanitizeState(raw = {}) {
  return {
    coins: toSafeInt(raw.coins, DEFAULT_STATE.coins),
    clickPower: Math.max(1, toSafeInt(raw.clickPower, DEFAULT_STATE.clickPower)),
    autoClickers: toSafeInt(raw.autoClickers, DEFAULT_STATE.autoClickers),
    clickUpgradeLevel: toSafeInt(raw.clickUpgradeLevel, DEFAULT_STATE.clickUpgradeLevel),
    clickUpgradePrice: Math.max(1, toSafeInt(raw.clickUpgradePrice, DEFAULT_STATE.clickUpgradePrice)),
    autoUpgradePrice: Math.max(1, toSafeInt(raw.autoUpgradePrice, DEFAULT_STATE.autoUpgradePrice))
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }

    return sanitizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("Не удалось загрузить сохранение:", error);
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Не удалось сохранить прогресс:", error);
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(toSafeInt(value));
}

function setBuyButtonState(button, canBuy) {
  button.disabled = !canBuy;
  button.classList.toggle("is-disabled", !canBuy);
}

function render() {
  elements.coins.textContent = formatNumber(state.coins);
  elements.coinsPerClick.textContent = formatNumber(state.clickPower);
  elements.autoClickers.textContent = formatNumber(state.autoClickers);
  elements.clickLevel.textContent = formatNumber(state.clickUpgradeLevel);
  elements.autoLevel.textContent = formatNumber(state.autoClickers);
  elements.clickPrice.textContent = formatNumber(state.clickUpgradePrice);
  elements.autoPrice.textContent = formatNumber(state.autoUpgradePrice);

  setBuyButtonState(elements.buyClickPower, state.coins >= state.clickUpgradePrice);
  setBuyButtonState(elements.buyAutoClicker, state.coins >= state.autoUpgradePrice);
}

function addCoins(amount) {
  const safeAmount = toSafeInt(amount);
  if (safeAmount <= 0) {
    return;
  }

  state.coins = toSafeInt(state.coins + safeAmount);
  saveState();
  render();
}

function spendCoins(cost) {
  const safeCost = toSafeInt(cost);
  if (safeCost <= 0) {
    return false;
  }

  if (state.coins < safeCost) {
    return false;
  }

  state.coins = toSafeInt(state.coins - safeCost);
  return true;
}

// Визуальный эффект: всплывающий текст +монеты из точки клика.
function spawnFloatingPlus(event, amount) {
  const rect = elements.clickTarget.getBoundingClientRect();
  const plus = document.createElement("span");
  plus.className = "floating-plus";
  plus.textContent = `+${formatNumber(amount)}`;
  plus.style.left = `${event.clientX - rect.left}px`;
  plus.style.top = `${event.clientY - rect.top}px`;
  elements.clickTarget.appendChild(plus);

  plus.addEventListener("animationend", () => {
    plus.remove();
  });
}

function pressAnimation() {
  elements.clickTarget.classList.remove("pressed");
  void elements.clickTarget.offsetWidth;
  elements.clickTarget.classList.add("pressed");
}

elements.clickTarget.addEventListener("click", (event) => {
  addCoins(state.clickPower);
  pressAnimation();
  spawnFloatingPlus(event, state.clickPower);
});

// Покупка силы клика: +1 монета за клик, цена растет плавно.
elements.buyClickPower.addEventListener("click", () => {
  if (!spendCoins(state.clickUpgradePrice)) {
    render();
    return;
  }

  state.clickPower += 1;
  state.clickUpgradeLevel += 1;
  state.clickUpgradePrice = Math.ceil(state.clickUpgradePrice * 1.35);
  saveState();
  render();
});

// Покупка автокликера: +1 монета в секунду, цена растет быстрее.
elements.buyAutoClicker.addEventListener("click", () => {
  if (!spendCoins(state.autoUpgradePrice)) {
    render();
    return;
  }

  state.autoClickers += 1;
  state.autoUpgradePrice = Math.ceil(state.autoUpgradePrice * 1.55);
  saveState();
  render();
});

setInterval(() => {
  if (state.autoClickers > 0) {
    addCoins(state.autoClickers);
  }
}, 1000);

elements.resetProgress.addEventListener("click", () => {
  const ok = window.confirm("Сбросить весь прогресс? Это действие нельзя отменить.");
  if (!ok) {
    return;
  }

  state = { ...DEFAULT_STATE };
  saveState();
  render();
});

// Если фото удалят, покажем аккуратную SVG-заглушку, чтобы игра не ломалась.
elements.targetPhoto.addEventListener("error", () => {
  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%230f2f74'/%3E%3Cstop offset='1' stop-color='%23214da8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='900' fill='url(%23g)'/%3E%3Ccircle cx='450' cy='330' r='180' fill='%2389b7ff'/%3E%3Crect x='210' y='520' width='480' height='280' rx='140' fill='%2389b7ff'/%3E%3Ctext x='450' y='860' text-anchor='middle' fill='white' font-size='52' font-family='Segoe UI'%3EДобавьте фото в assets/target-photo.png%3C/text%3E%3C/svg%3E";
  elements.targetPhoto.src = fallback;
});

render();
