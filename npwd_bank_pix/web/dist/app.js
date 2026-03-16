const statusEl = document.getElementById('status');
const balanceEl = document.getElementById('balance');
const coinsEl = document.getElementById('coins');
const profileEl = document.getElementById('profile');
const historyEl = document.getElementById('history');
const pixCodeInput = document.getElementById('pixCode');
const toastsEl = document.getElementById('toasts');

function showStatus(text) { statusEl.innerText = text || ''; }
function validateCode(code) { return /^\d{6}$/.test(code); }
function validateAmount(amount) { return Number.isFinite(amount) && amount > 0; }

const ERRORS = {
  PIX_CODE_INVALID: 'Código PIX inválido',
  IDENTIFIER_NOT_FOUND: 'Identificador do jogador não encontrado',
  PIX_CODE_TAKEN: 'Código PIX já em uso',
  PIX_ALREADY_SET: 'Você já possui uma chave PIX',
  PIX_AMOUNT_INVALID: 'Valor de transferência inválido',
  PIX_TARGET_NOT_FOUND: 'Destinatário não encontrado',
  PIX_TARGET_OFFLINE: 'Destinatário está offline',
  INSUFFICIENT_FUNDS: 'Saldo insuficiente',
  GEN_FAIL: 'Falha ao gerar chave',
  PIX_NOT_SET: 'Você não possui chave cadastrada'
};
function mapError(code) {
  return ERRORS[code] || `Erro: ${code}`;
}

function showToast(text, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerText = text;
  toastsEl.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0.9';
  }, 0);
  setTimeout(() => {
    el.style.opacity = '0.5';
  }, 2500);
  setTimeout(() => {
    toastsEl.removeChild(el);
  }, 3500);
}

function setBalance(data) {
  if (typeof data === 'number') {
    balanceEl.innerText = `Saldo: $${data}`;
    return;
  }
  balanceEl.innerText = `Saldo: $${Number(data?.balance ?? 0)}`;
  const hasCoins = Number.isFinite(Number(data?.coins));
  if (hasCoins) {
    coinsEl.style.display = '';
    coinsEl.innerText = `Moedas: ${Number(data.coins)}`;
  } else {
    coinsEl.style.display = 'none';
  }
}

function renderHistory(rows) {
  historyEl.innerHTML = '';
  (rows || []).forEach(r => {
    const el = document.createElement('div');
    el.className = 'history-item';
    const dir = r.dir === 'in' ? 'Recebido' : r.dir === 'out' ? 'Enviado' : 'Outro';
    el.innerHTML = `<span>${dir}</span><span>$${r.amount}</span>`;
    historyEl.appendChild(el);
  });
}

function requestBalance() {
  fetch(`https://${GetParentResourceName()}/npwd_pix:getBalance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({})
  });
}

function requestInitial() {
  fetch(`https://${GetParentResourceName()}/npwd_pix:getInitial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({})
  }).then(r => r.json()).then(resp => {
    const data = resp?.data;
    if (!data) return;
    if (data.name) profileEl.innerText = data.name;
    setBalance({ balance: data.bank, coins: data.coins });
    if (data.code) pixCodeInput.value = data.code;
  }).catch(() => {});
}

document.getElementById('btnRegister').addEventListener('click', () => {
  const code = pixCodeInput.value.trim();
  if (!validateCode(code)) {
    const text = 'Código inválido: informe 6 dígitos';
    showStatus(text);
    showToast(text, 'error');
    fetch(`https://${GetParentResourceName()}/npwd_pix:notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ message: text })
    });
    return;
  }
  fetch(`https://${GetParentResourceName()}/npwd_pix:register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ code })
  }).then(() => {
    showStatus('Solicitação enviada...');
    showToast('Solicitando cadastro...', 'success');
  });
});

document.getElementById('btnTransfer').addEventListener('click', () => {
  const code = document.getElementById('toCode').value.trim();
  const amount = Number(document.getElementById('amount').value);
  if (!validateCode(code)) {
    const text = 'Código destino inválido';
    showStatus(text);
    showToast(text, 'error');
    fetch(`https://${GetParentResourceName()}/npwd_pix:notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ message: text })
    });
    return;
  }
  if (!validateAmount(amount)) {
    const text = 'Valor inválido';
    showStatus(text);
    showToast(text, 'error');
    fetch(`https://${GetParentResourceName()}/npwd_pix:notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ message: text })
    });
    return;
  }
  fetch(`https://${GetParentResourceName()}/npwd_pix:transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ code, amount })
  }).then(() => {
    showStatus('Transferência enviada...');
    showToast('Transferência enviada', 'success');
  });
});

document.getElementById('btnRandom').addEventListener('click', () => {
  fetch(`https://${GetParentResourceName()}/npwd_pix:randomRegister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({})
  }).then(() => {
    showStatus('Gerando e cadastrando chave aleatória...');
    showToast('Gerando chave aleatória...', 'success');
  });
});

document.getElementById('btnDelete').addEventListener('click', () => {
  fetch(`https://${GetParentResourceName()}/npwd_pix:delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({})
  }).then(() => {
    showStatus('Solicitando exclusão da chave...');
    showToast('Solicitando exclusão...', 'success');
  });
});

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.app !== 'npwd_pix') return;
  if (msg.action === 'registerResp') {
    showStatus(msg.success ? `Código cadastrado: ${msg.data}` : mapError(msg.data));
    if (msg.success) showToast('Chave cadastrada com sucesso', 'success');
    else showToast(mapError(msg.data), 'error');
    requestBalance();
  } else if (msg.action === 'deleteResp') {
    showStatus(msg.success ? `Chave apagada` : mapError(msg.data));
    if (msg.success) pixCodeInput.value = '';
    if (msg.success) showToast('Chave apagada com sucesso', 'success');
    else showToast(mapError(msg.data), 'error');
  } else if (msg.action === 'transferResp') {
    showStatus(msg.success ? `Transferido: ${msg.data.amount}` : mapError(msg.data));
    if (msg.success) showToast(`Transferido: $${msg.data.amount}`, 'success');
    else showToast(mapError(msg.data), 'error');
    requestBalance();
  } else if (msg.action === 'updateBalance') {
    setBalance(msg.data);
  } else if (msg.action === 'setMyCode') {
    pixCodeInput.value = msg.data || '';
  } else if (msg.action === 'setRandomCode') {
    pixCodeInput.value = msg.data || '';
  } else if (msg.action === 'setProfile') {
    profileEl.innerText = msg.data?.name || '';
  } else if (msg.action === 'setTransactions') {
    renderHistory(msg.data || []);
  } else if (msg.action === 'toast') {
    const t = msg.data || {};
    showToast(t.text || '', t.type || 'success');
  }
});

function requestTransactions() {
  fetch(`https://${GetParentResourceName()}/npwd_pix:getTransactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({})
  });
}

function requestMyCode() {
  fetch(`https://${GetParentResourceName()}/npwd_pix:getMyCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({})
  });
}

requestInitial();
requestBalance();
requestTransactions();
requestMyCode();

setInterval(() => {
  requestBalance();
  requestTransactions();
  requestMyCode();
}, 5000);
