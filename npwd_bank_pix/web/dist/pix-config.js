import { importShared } from './__federation_fn_import.js';

let React;
let useEffect, useState, createElement, Fragment;
let fetchNui;
const RESOURCE = 'npwd_bank_pix';

const __init = (async () => {
  try {
    const scope = globalThis.__federation_shared__ || {};
    const getShared = async (name) => {
      const bucket = (scope.default && scope.default[name]) || scope[name];
      if (!bucket) return null;
      const ver = Object.keys(bucket)[0];
      const entry = bucket[ver];
      if (!entry) return null;
      const mod = typeof entry.get === 'function' ? (await entry.get())?.() : entry;
      return mod?.default || mod;
    };
    const ReactMod = (await getShared('react')) || (await importShared('react'));
    React = ReactMod;
    ({ useEffect, useState, createElement, Fragment } = React);
    const NuiMod = (await getShared('fivem-nui-react-lib')) || (await importShared('fivem-nui-react-lib'));
    fetchNui = NuiMod.fetchNui || NuiMod.default?.fetchNui;
    
  } catch (e) {
    
  }
})();

function BankPixApp() {
  const [balanceNum, setBalanceNum] = useState(0);
  const [balanceText, setBalanceText] = useState('carregando...');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [status, setStatus] = useState('');
  const [myCode, setMyCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [amount, setAmount] = useState('');
  const [profile, setProfile] = useState({ name: 'Usuário' });
  const [view, setView] = useState('home'); // home | register | transfer | viewkey
  const [transactions, setTransactions] = useState([]);
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifText, setNotifText] = useState('');
  const [notifGoTo, setNotifGoTo] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [confOpen, setConfOpen] = useState(false);
  const [confName, setConfName] = useState('');
  const [confAmount, setConfAmount] = useState(0);
  const [pendingCode, setPendingCode] = useState('');
  const [pendingAmount, setPendingAmount] = useState(0);
  const [dailyTotals, setDailyTotals] = useState({ sent: 0, received: 0, net: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [contacts, setContacts] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactCode, setNewContactCode] = useState('');
  useEffect(() => {}, []);

  const nui = (name, data) => {
    if (fetchNui) return fetchNui(name, data || {});
    try {
      return fetch(`https://${RESOURCE}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
    } catch (_) {
      return Promise.resolve();
    }
  };

  useEffect(() => {
    
    try {
      const id = 'npwd_pix_noscroll_style';
      if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
        `;
        document.head.appendChild(style);
      }
    } catch (_) {}
    nui('npwd_pix:setActive', { active: true });
    nui('npwd_pix:getInitial', {}).then(async (res) => {
      try {
        let initial = null;
        if (res && res.data) {
          initial = res.data;
        } else if (res && typeof res.json === 'function') {
          const j = await res.json();
          initial = j && (j.data || j);
        }
        
        if (initial) {
          setProfile({ name: initial.name || 'Usuário' });
          const v = Number(initial.bank || 0);
          setBalanceNum(v);
          try {
            setBalanceText(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v));
          } catch (_) {
            setBalanceText(`R$ ${v}`);
          }
          
          setMyCode(initial.code || '');
        }
      } catch (e) {
        
      }
    }).catch(() => {});
    nui('npwd_pix:getDailyTotals', {}).then(async (res) => {
      try {
        let totals = null;
        if (res && res.data) {
          totals = res.data;
        } else if (res && typeof res.json === 'function') {
          const j = await res.json();
          totals = j && (j.data || j);
        }
        if (totals) {
          const sent = Number(totals.sent || 0);
          const received = Number(totals.received || 0);
          setDailyTotals({ sent, received, net: (received - sent) });
        }
      } catch (_) {}
    }).catch(() => {});
    nui('npwd_pix:getTransactions', {}).catch(() => {});
    nui('npwd_pix:getContacts', {}).catch(() => {});
    const timer = setInterval(() => {
      nui('npwd_pix:getBalance', {});
      nui('npwd_pix:getTransactions', {});
      nui('npwd_pix:getDailyTotals', {}).then(async (res) => {
        try {
          let totals = null;
          if (res && res.data) {
            totals = res.data;
          } else if (res && typeof res.json === 'function') {
            const j = await res.json();
            totals = j && (j.data || j);
          }
          if (totals) {
            const sent = Number(totals.sent || 0);
            const received = Number(totals.received || 0);
            setDailyTotals({ sent, received, net: (received - sent) });
          }
        } catch (_) {}
      }).catch(() => {});
    }, 7000);
    const handler = (event) => {
      try {
        const msg = event.data;
        if (!msg || msg.app !== 'npwd_bank_pix') return;
        
        if (msg.action === 'updateBalance') {
          const v = Number((msg.data && msg.data.balance) || 0);
          setBalanceNum(v);
          try {
            setBalanceText(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v));
          } catch (_) {
            setBalanceText(`R$ ${v}`);
          }
          
        } else if (msg.action === 'registerResp') {
          const t = msg.success ? 'Chave cadastrada' : 'Erro ao cadastrar';
          const d = msg.success ? String(msg.data) : String(msg.data);
          setNotifTitle(t);
          setNotifText(d);
          setNotifOpen(true);
          setNotifGoTo(msg.success ? 'viewkey' : '');
          setNotifType(msg.success ? 'success' : 'error');
          if (msg.success) {
            setMyCode(msg.data || '');
            setView('viewkey');
            nui('npwd_pix:getMyCode', {});
          }
        } else if (msg.action === 'transferResp') {
          const t = msg.success ? 'Transferência enviada' : 'Erro na transferência';
          const d = msg.success ? String(msg.data && msg.data.amount) : String(msg.data);
          setNotifTitle(t);
          setNotifText(d);
          setNotifOpen(true);
          setNotifGoTo(msg.success ? 'home' : '');
          setNotifType(msg.success ? 'success' : 'error');
          if (msg.success) {
            setToCode('');
            setAmount('');
            nui('npwd_pix:getBalance', {});
          }
        } else if (msg.action === 'deleteResp') {
          const t = msg.success ? 'Chave apagada' : 'Erro ao apagar';
          const d = msg.success ? '' : String(msg.data);
          setNotifTitle(t);
          setNotifText(d);
          setNotifOpen(true);
          setNotifGoTo('');
          setNotifType(msg.success ? 'success' : 'error');
          if (msg.success) {
            setMyCode('');
            setView('viewkey');
            nui('npwd_pix:getMyCode', {});
          }
        } else if (msg.action === 'randomRegister:resp') {
          const t = msg.success ? 'Chave aleatória cadastrada' : 'Erro ao cadastrar';
          const d = String(msg.data);
          setNotifTitle(t);
          setNotifText(d);
          setNotifOpen(true);
          setNotifGoTo(msg.success ? 'viewkey' : '');
          setNotifType(msg.success ? 'success' : 'error');
          if (msg.success) {
            setMyCode(msg.data || '');
            setView('viewkey');
            nui('npwd_pix:getMyCode', {});
          }
        }
        if (msg.action === 'setMyCode') {
          setMyCode(msg.data || '');
        }
        if (msg.action === 'setRandomCode') {
          setMyCode(msg.data || '');
          setStatus('Código gerado');
        }
        if (msg.action === 'setProfile') {
          setProfile({ name: (msg.data && msg.data.name) || 'Usuário' });
        }
        if (msg.action === 'setTransactions') {
          setTransactions(Array.isArray(msg.data) ? msg.data : []);
        }
        if (msg.action === 'setContacts') {
          setContacts(Array.isArray(msg.data) ? msg.data : []);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      clearInterval(timer);
      nui('npwd_pix:setActive', { active: false });
    };
  }, [refreshKey]);

  const onRegister = () => {
    const code = (myCode || '').trim();
    if (!/^\d{6}$/.test(code)) {
      setNotifTitle('Código inválido');
      setNotifText('Informe um código de 6 dígitos.');
      setNotifType('error');
      setNotifOpen(true);
      return;
    }
    setNotifTitle('Cadastrando...');
    setNotifText('Enviando solicitação');
    setNotifType('info');
    setNotifOpen(true);
    nui('npwd_pix:register', { code });
  };

  const onTransfer = () => {
    const code = (toCode || '').trim();
    const value = Number(amount);
    if (!/^\d{6}$/.test(code)) {
      setNotifTitle('Código destino inválido');
      setNotifText('Informe 6 dígitos.');
      setNotifType('error');
      setNotifOpen(true);
      return;
    }
    if (!(Number.isFinite(value) && value > 0)) {
      setNotifTitle('Valor inválido');
      setNotifText('Informe um valor maior que 0.');
      setNotifType('error');
      setNotifOpen(true);
      return;
    }
    setPendingCode(code);
    setPendingAmount(value);
    nui('npwd_pix:resolveByCode', { code }).then(async (res) => {
      let nm = null;
      if (res && res.data) nm = res.data;
      else if (res && typeof res.json === 'function') {
        const j = await res.json();
        nm = j && (j.data || j);
      }
      setConfName(nm || (`PIX ${code}`));
      setConfAmount(value);
      setConfOpen(true);
    }).catch(() => {
      setConfName(`PIX ${code}`);
      setConfAmount(value);
      setConfOpen(true);
    });
  };
  const confirmTransfer = () => {
    const code = pendingCode;
    const value = pendingAmount;
    setConfOpen(false);
    setNotifTitle('Enviando transferência...');
    setNotifText('Aguarde a confirmação');
    setNotifType('info');
    setNotifOpen(true);
    nui('npwd_pix:transfer', { code, amount: value });
  };

  const onRandom = () => {
    setNotifTitle('Gerando chave...');
    setNotifText('Aguarde alguns instantes');
    setNotifType('info');
    setNotifOpen(true);
    nui('npwd_pix:randomCode', {});
  };

  const onDelete = () => {
    setNotifTitle('Apagando chave...');
    setNotifText('Enviando solicitação');
    setNotifType('info');
    setNotifOpen(true);
    nui('npwd_pix:delete', {});
  };
  const onRandomRegister = () => {
    setNotifTitle('Cadastrando chave aleatória...');
    setNotifText('Aguarde a confirmação');
    setNotifType('info');
    setNotifOpen(true);
    nui('npwd_pix:randomRegister', {});
  };
  const onRefreshApp = () => {
    setNotifTitle('Atualizando app...');
    setNotifText('Recarregando dados');
    setNotifType('info');
    setNotifOpen(true);
    setStatus('');
    setView('home');
    setRefreshKey((k) => k + 1);
  };
  const openNewKey = () => {
    setNewKeyInput('');
    setNewKeyOpen(true);
  };
  const closeNewKey = () => {
    setNewKeyOpen(false);
  };
  const saveNewKey = () => {
    const code = (newKeyInput || '').trim();
    if (!/^\d{6}$/.test(code)) {
      setNotifTitle('Código inválido');
      setNotifText('Informe um código de 6 dígitos.');
      setNotifType('error');
      setNotifOpen(true);
      return;
    }
    setNotifTitle('Cadastrando...');
    setNotifText('Enviando solicitação');
    setNotifType('info');
    setNotifOpen(true);
    nui('npwd_pix:register', { code });
    setNewKeyOpen(false);
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (_) {
      return false;
    }
  };
  const onCopy = async () => {
    const code = (myCode || '').trim();
    if (!code) { setStatus('Você não tem código cadastrado.'); return; }
    const ok = await copyText(code);
    setNotifTitle(ok ? 'Chave copiada' : 'Falha ao copiar');
    setNotifText(ok ? code : 'Tente novamente');
    setNotifType(ok ? 'success' : 'error');
    setNotifOpen(true);
  };

  const input = (props) => createElement('input', props);
  const button = (props, children) => {
    const style = { ...(props.style || {}), fontWeight: 600, transition: 'opacity .15s ease, transform .15s ease', borderRadius: '10px', padding: '6px 8px' };
    const onEnter = (e) => { e.currentTarget.style.opacity = '0.95'; e.currentTarget.style.transform = 'translateY(-1px)'; if (props.onMouseEnter) props.onMouseEnter(e); };
    const onLeave = (e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; if (props.onMouseLeave) props.onMouseLeave(e); };
    return createElement('button', { ...props, style, onMouseEnter: onEnter, onMouseLeave: onLeave }, children);
  };
  const label = (props, children) => createElement('label', props, children);
  const div = (props, children) => createElement('div', props, children);
  const h = (level, props, children) => createElement(`h${level}`, props, children);

  const palette = { bg: '#0f141a', panel: '#141b22', primary: '#2259e1', success: '#16a34a', danger: '#dc2626', neutral: '#475569' };
  const card = div({ style: { position: 'relative', borderRadius: '12px', padding: '10px', color: '#e5e7eb', background: palette.panel, width: '100%', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.06)`, display: 'flex', flexDirection: 'column', gap: '8px' } }, [
    h(4, { style: { margin: 0, fontSize: '16px', letterSpacing: '0.2px', color: '#fff' } }, 'Banco'),
    div({ style: { fontSize: '15px', fontWeight: 700, opacity: 0.95 } }, profile.name),
    myCode ? div({ style: { display: 'inline-block', width: 'fit-content', alignSelf: 'flex-start', whiteSpace: 'nowrap', fontSize: '11px', color: '#d1fae5', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', padding: '4px 6px', borderRadius: '8px' } }, 'Chave cadastrada') :
             div({ style: { display: 'inline-block', width: 'fit-content', alignSelf: 'flex-start', whiteSpace: 'nowrap', fontSize: '11px', color: '#fee2e2', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', padding: '4px 6px', borderRadius: '8px' } }, 'Sem chave'),
    div({ style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, [
      div({ style: { fontSize: '11px', opacity: 0.8 } }, 'Saldo'),
      div({ style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '6px' } }, [
        div({ style: { fontSize: '18px', fontWeight: 700, wordBreak: 'break-word' } }, balanceHidden ? '••••••' : balanceText),
        button({ style: { width: '28px', height: '28px', borderRadius: '10px', background: palette.neutral, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }, onClick: () => setBalanceHidden(!balanceHidden) }, balanceHidden ? EyeClosedIcon() : EyeOpenIcon())
      ])
    ])
  ]);

  const homeActions = div({ style: { display: 'grid', gridTemplateColumns: '0.7fr 1fr', gap: '8px', width: '100%', padding: '2px' } }, [
    button({ style: { background: palette.neutral, color: '#fff', padding: '6px 8px' }, onClick: () => setView('viewkey') }, 'Minha Chave'),
    button({ style: { background: palette.primary, color: '#fff', padding: '8px 10px' }, onClick: () => setView('transfer') }, 'Transferir'),
  ]);
  const firstName = (nm) => {
    if (!nm || typeof nm !== 'string') return '';
    const parts = nm.split(' ').filter(Boolean);
    return parts[0] || nm;
  };
  const histItemSmall = (t) => {
    const val = Number(t.amount || 0);
    const txt = (() => { try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val); } catch (_) { return `R$ ${val}`; } })();
    const meFrom = myCode && t.from_code && t.from_code === myCode;
    const meTo = myCode && t.to_code && t.to_code === myCode;
    const youLeft = !myCode && t.dir === 'out';
    const youRight = !myCode && t.dir === 'in';
    const left = (meFrom || youLeft) ? 'Você' : (t.from_name ? firstName(t.from_name) : (t.from_code ? `PIX ${t.from_code}` : 'Desconhecido'));
    const right = (meTo || youRight) ? 'Você' : (t.to_name ? firstName(t.to_name) : (t.to_code ? `PIX ${t.to_code}` : 'Desconhecido'));
    const color = t.dir === 'out' ? '#ef4444' : (t.dir === 'in' ? '#16a34a' : '#e5e7eb');
    return div({ style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '6px' } }, [
      div({ style: { fontSize: '11px', opacity: 0.85 } }, `${left} → ${right}`),
      div({ style: { fontSize: '12px', fontWeight: 600, color } }, txt),
    ]);
  };
  const fmtBRL = (v) => { try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0)); } catch (_) { return `R$ ${Number(v || 0)}`; } };
  const homeSummary = div({ style: { background: palette.panel, borderRadius: '12px', padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px', border: `1px solid rgba(255,255,255,0.08)` } }, [
    h(4, { style: { margin: 0, fontSize: '14px' } }, 'Resumo diário'),
    div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } }, [
      div({ style: { fontSize: '12px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.35)', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' } }, `Enviado ${fmtBRL(dailyTotals.sent)}`),
      div({ style: { fontSize: '12px', background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.35)', padding: '6px 8px', borderRadius: '8px', textAlign: 'center' } }, `Recebido ${fmtBRL(dailyTotals.received)}`),
    ]),
    (() => {
      const n = Number(dailyTotals.net || 0);
      const pos = n > 0, neg = n < 0;
      const bg = pos ? 'rgba(22,163,74,0.12)' : (neg ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)');
      const bd = pos ? '1px solid rgba(22,163,74,0.35)' : (neg ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(148,163,184,0.35)');
      const label = pos ? 'Saldo do dia: + ' : (neg ? 'Saldo do dia: - ' : 'Saldo do dia: ');
      return div({ style: { fontSize: '12px', background: bg, border: bd, padding: '6px 8px', borderRadius: '8px', textAlign: 'center' } }, `${label}${fmtBRL(Math.abs(n))}`);
    })(),
  ]);

  const viewKeyButton = myCode ? button({ style: { width: '100%', background: palette.neutral, color: '#fff' }, onClick: () => setView('viewkey') }, 'Ver Chave') : null;

  const registerView = div({ style: { background: palette.panel, borderRadius: '12px', padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.08)` } }, [
    div({ style: { display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '8px' } }, [
      button({ style: { width: '28px', height: '28px', borderRadius: '10px', background: palette.danger, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }, onClick: () => setView('home') }, '←'),
      h(4, { style: { margin: 0 } }, 'Cadastrar Chave PIX')
    ]),
    div({ style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [
      input({ style: { width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid rgba(255,255,255,0.12)`, background: '#0a1117', color: '#e6f0ff', fontSize: '13px' }, maxLength: 6, value: myCode, onChange: (e) => setMyCode(e.target.value) }),
    ]),
    div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } }, [
      button({ style: { background: palette.success, color: '#fff' }, onClick: onRandom }, 'Gerar'),
      button({ style: { background: palette.primary, color: '#fff' }, onClick: onRegister }, 'Cadastrar')
    ])
  ]);

  const transferView = div({ style: { background: palette.panel, borderRadius: '12px', padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 6px 14px rgba(0,0,0,0.28)', border: `1px solid rgba(255,255,255,0.08)`, height: '100%', minHeight: 0 } }, [
    div({ style: { display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '8px' } }, [
      button({ style: { width: '28px', height: '28px', borderRadius: '10px', background: palette.danger, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }, onClick: () => setView('home') }, '←'),
      h(4, { style: { margin: 0 } }, 'Transferência')
    ]),
    div({ className: 'no-scrollbar', style: { display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingBottom: '18px', scrollPaddingBottom: '18px' } }, [
      div({ style: { background: 'rgba(10,17,23,0.65)', border: `1px solid rgba(255,255,255,0.10)`, borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' } }, [
        div({ style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          label({ style: { fontSize: '12px', opacity: 0.85 } }, 'Código de destino'),
          input({ style: { width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.12)`, background: '#0a1117', color: '#e6f0ff', fontSize: '14px' }, placeholder: 'Digite o código (6 dígitos)', maxLength: 6, value: toCode, onChange: (e) => setToCode(e.target.value) })
        ]),
        div({ style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          label({ style: { fontSize: '12px', opacity: 0.85 } }, 'Valor'),
          input({ style: { width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.12)`, background: '#0a1117', color: '#e6f0ff', fontSize: '14px' }, type: 'number', min: 1, placeholder: 'Informe o valor', value: amount, onChange: (e) => setAmount(e.target.value) })
        ]),
        button({ style: { background: palette.success, color: '#fff', width: '100%', padding: '10px', borderRadius: '10px' }, onClick: onTransfer }, 'Enviar')
      ]),
      div({ style: { background: palette.panel, borderRadius: '12px', padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.06)`, width: '100%' } }, [
        div({ style: { margin: '-11px -11px 0', background: 'rgba(10,17,23,1)', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 14px rgba(0,0,0,0.45)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' } }, [
          h(4, { style: { margin: 0 } }, 'Contatos PIX')
        ]),
        div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } }, [
          input({ style: { width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.12)`, background: '#0a1117', color: '#e6f0ff', fontSize: '14px' }, placeholder: 'Nome', value: newContactName, onChange: (e) => setNewContactName(e.target.value) }),
          input({ style: { width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.12)`, background: '#0a1117', color: '#e6f0ff', fontSize: '14px' }, placeholder: 'Código (6 dígitos)', maxLength: 6, value: newContactCode, onChange: (e) => setNewContactCode(e.target.value) }),
        ]),
      button({ style: { background: palette.primary, color: '#fff', padding: '10px', borderRadius: '10px' }, onClick: () => {
          const name = newContactName.trim();
          const code = newContactCode.trim();
          if (!name || !/^\d{6}$/.test(code)) {
            setNotifTitle('Dados inválidos');
            setNotifText('Preencha nome e código (6 dígitos).');
            setNotifType('error'); setNotifOpen(true); return;
          }
          nui('npwd_pix:addContact', { name, code });
          setNewContactName(''); setNewContactCode('');
        } }, 'Salvar contato'),
        ((contacts && contacts.length > 0) ?
          div({ className: 'no-scrollbar', style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '24vh', overflowY: 'auto', paddingRight: '2px' } }, (contacts || []).slice(-12).reverse().map((c) =>
            div({ style: { display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '6px' } }, [
              div({ style: { fontSize: '12px', opacity: 0.9 } }, `${c.name} • ${c.code}`),
              button({ style: { background: palette.neutral, color: '#fff', padding: '6px 10px', borderRadius: '10px' }, onClick: () => setToCode(c.code) }, 'Usar'),
              button({ style: { background: palette.danger, color: '#fff', padding: '6px 10px', borderRadius: '10px' }, onClick: () => { nui('npwd_pix:deleteContact', { code: c.code }); } }, 'Excluir'),
            ])
          )) :
          div({ style: { padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(10,17,23,0.45)', textAlign: 'center', color: '#e5e7eb', fontSize: '12px' } }, 'Sem contatos'))
      ])
    ])
  ]);

  const viewKeyView = div({ style: { background: palette.panel, borderRadius: '12px', padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.06)` } }, [
    div({ style: { display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '8px' } }, [
      button({ style: { width: '28px', height: '28px', borderRadius: '10px', background: palette.danger, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }, onClick: () => setView('home') }, '←'),
      h(4, { style: { margin: 0 } }, 'Minha Chave')
    ]),
    div({ style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' } }, [
      div({}, myCode || 'Não cadastrada'),
      myCode ? div({ style: { display: 'flex', gap: '8px' } }, [
        button({ style: { background: palette.neutral, color: '#fff' }, onClick: onCopy }, 'Copiar'),
        button({ style: { background: palette.danger, color: '#fff' }, onClick: onDelete }, 'Apagar')
      ]) : null
    ]),
    myCode ? null : div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } }, [
      button({ style: { background: palette.primary, color: '#fff' }, onClick: openNewKey }, 'Nova Chave'),
      button({ style: { background: palette.success, color: '#fff' }, onClick: onRandomRegister }, 'Gerar Aleatória')
    ])
  ]);

  const histItem = (t) => {
    const val = Number(t.amount || 0);
    const txt = (() => { try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val); } catch (_) { return `R$ ${val}`; } })();
    const meFrom = myCode && t.from_code && t.from_code === myCode;
    const meTo = myCode && t.to_code && t.to_code === myCode;
    const youLeft = !myCode && t.dir === 'out';
    const youRight = !myCode && t.dir === 'in';
    const left = (meFrom || youLeft) ? 'Você' : (t.from_name ? firstName(t.from_name) : (t.from_code ? `PIX ${t.from_code}` : 'Desconhecido'));
    const right = (meTo || youRight) ? 'Você' : (t.to_name ? firstName(t.to_name) : (t.to_code ? `PIX ${t.to_code}` : 'Desconhecido'));
    const dt = t.created_at ? new Date(t.created_at) : null;
    const when = (() => { try { return dt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dt) : ''; } catch (_) { return dt ? String(dt) : ''; } })();
    const color = t.dir === 'out' ? '#ef4444' : (t.dir === 'in' ? '#16a34a' : '#e5e7eb');
    return div({ style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '8px' } }, [
      div({ style: { fontSize: '12px', opacity: 0.9 } }, `${left} → ${right}`),
      div({ style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' } }, [
        div({ style: { fontSize: '13px', fontWeight: 700, color } }, txt),
        when ? div({ style: { fontSize: '11px', opacity: 0.7 } }, when) : null
      ])
    ]);
  };

  const homeHistory = div({ className: 'no-scrollbar', style: { background: palette.panel, borderRadius: '12px', padding: '10px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.06)`, flex: '0 0 auto', height: '32vh', maxHeight: '32vh', overflowY: 'auto', overflowX: 'hidden', width: '100%', paddingBottom: '18px', scrollPaddingBottom: '18px' } }, [
    div({ style: { position: 'sticky', top: 0, zIndex: 100 } }, [
      div({ style: { margin: '-11px -11px 0', background: 'rgba(10,17,23,1)', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 14px rgba(0,0,0,0.45)' } }, [
        h(4, { style: { margin: 0 } }, 'Histórico')
      ])
    ]),
    ((transactions && transactions.length > 0) ? div({}, (transactions || []).map(histItem)) :
      div({ style: { padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(10,17,23,0.65)', textAlign: 'center', color: '#e5e7eb', fontSize: '12px' } }, 'Sem histórico'))
  ]);

  const secondaryButtons = null;

  const content = view === 'home' ? div({ style: { display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0, height: '100%' } }, [card, homeActions, homeSummary, homeHistory]) :
                  view === 'register' ? registerView :
                  view === 'transfer' ? transferView :
                  view === 'viewkey' ? viewKeyView : homeHistory;

  const statusColor = status && status.startsWith('Erro') ? '#ef4444' : palette.primary;
  const modalOverlay = newKeyOpen ? div({ style: { position: 'fixed', inset: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 } }, [
    div({ style: { background: palette.panel, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '12px', width: '90%', maxWidth: '340px', padding: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.30)', display: 'flex', flexDirection: 'column', gap: '10px', color: '#fff' } }, [
      h(4, { style: { margin: 0 } }, 'Nova Chave'),
      input({ style: { width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.12)`, background: '#0a1117', color: '#e6f0ff' }, maxLength: 6, value: newKeyInput, onChange: (e) => setNewKeyInput(e.target.value) }),
      div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, [
        button({ style: { background: palette.neutral, color: '#fff' }, onClick: closeNewKey }, 'Cancelar'),
        button({ style: { background: palette.primary, color: '#fff' }, onClick: saveNewKey }, 'Salvar')
      ])
    ])
  ]) : null;

  useEffect(() => {
    if (!notifOpen) return;
    const to = setTimeout(() => setNotifOpen(false), 3500);
    return () => { clearTimeout(to); };
  }, [notifOpen]);
  const notifColor = notifType === 'success' ? palette.success : (notifType === 'error' ? palette.danger : palette.primary);
  const notifOverlay = notifOpen ? div({ style: { position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, paddingTop: '12px', width: '100%', pointerEvents: 'auto', transition: 'opacity .2s ease' } }, [
    div({ style: { background: palette.panel, border: `2px solid ${notifColor}`, borderRadius: '12px', width: '92%', maxWidth: '360px', padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '8px', color: '#fff', transform: 'translateY(0)', transition: 'transform .2s ease' } }, [
      h(4, { style: { margin: 0 } }, notifTitle || 'Aviso'),
      div({}, notifText || ''),
      div({ style: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px' } }, [
        button({ style: { background: palette.neutral, color: '#fff' }, onClick: () => setNotifOpen(false) }, 'Fechar')
      ])
    ])
  ]) : null;
  const confirmOverlay = confOpen ? div({ style: { position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, paddingTop: '12px', width: '100%', pointerEvents: 'auto' } }, [
    div({ style: { background: palette.panel, border: `2px solid ${palette.primary}`, borderRadius: '12px', width: '92%', maxWidth: '360px', padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '8px', color: '#fff' } }, [
      h(4, { style: { margin: 0 } }, 'Confirmar envio'),
      div({}, `${confName} • ${(() => { try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(confAmount); } catch (_) { return 'R$ '+String(confAmount); } })()}`),
      div({ style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, [
        button({ style: { background: palette.neutral, color: '#fff' }, onClick: () => setConfOpen(false) }, 'Cancelar'),
        button({ style: { background: palette.primary, color: '#fff' }, onClick: confirmTransfer }, 'Confirmar')
      ])
    ])
  ]) : null;

  return div({ style: { padding: '8px', paddingBottom: '8px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box', background: palette.bg, position: 'relative', overflow: 'visible', overflowX: 'hidden', minHeight: 0, height: '100%' } }, [
    content,
    confirmOverlay,
    notifOverlay,
    modalOverlay
  ]);
}

const PixIcon = () => createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none' },
  createElement('circle', { cx: 12, cy: 12, r: 10, stroke: 'currentColor', strokeWidth: 2 }),
  createElement('text', { x: 12, y: 16, textAnchor: 'middle', fill: 'currentColor', fontSize: 14, fontWeight: 700 }, '$')
);

const NotificationIcon = PixIcon;

const path = '/npwd_bank_pix';

export default () => ({
  id: 'npwd_bank_pix',
  nameLocale: 'Banco',
  color: '#fff',
  backgroundColor: '#ff8800ff',
  path,
  icon: PixIcon,
  app: BankPixApp,
  notificationIcon: NotificationIcon
});

export const __tla = __init;

function EyeOpenIcon() {
  return createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' },
    createElement('path', { d: 'M1 12C3.5 7.5 7.5 5 12 5s8.5 2.5 11 7c-2.5 4.5-6.5 7-11 7s-8.5-2.5-11-7z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' }),
    createElement('circle', { cx: 12, cy: 12, r: 3, fill: 'currentColor' })
  );
}
function EyeClosedIcon() {
  return createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' },
    createElement('path', { d: 'M1 12C3.5 7.5 7.5 5 12 5s8.5 2.5 11 7c-2.5 4.5-6.5 7-11 7s-8.5-2.5-11-7z', stroke: 'currentColor', strokeWidth: 2, fill: 'none' }),
    createElement('line', { x1: 3, y1: 3, x2: 21, y2: 21, stroke: 'currentColor', strokeWidth: 2 })
  );
}
