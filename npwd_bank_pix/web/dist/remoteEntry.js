let sharedScope = null;
export function init(scope) {
  sharedScope = scope;
  const g = globalThis;
  const cur = g.__federation_shared__ || {};
  g.__federation_shared__ = cur;
  Object.keys(scope || {}).forEach((k) => {
    cur[k] = { ...(cur[k] || {}), ...(scope[k] || {}) };
  });
}

function dynamicLoadingCss() {}

// Preload config asynchronously, but keep a sync getter
let __pixConfigObj = null;
try {
  import('./pix-config.js').then(async (mod) => {
    try {
      if (mod && mod.__tla && typeof mod.__tla.then === 'function') {
        await mod.__tla;
      }
    } catch (_) {}
    __pixConfigObj = (mod && mod.default) ? mod.default : mod;
    console.log('npwd_pix remoteEntry config preloaded');
  }).catch((e) => {
    console.error('npwd_pix remoteEntry preload error', e);
  });
} catch (e) {
  console.error('npwd_pix remoteEntry import setup error', e);
}

function loadModule(path) {
  if (path === './config') {
    const ensure = async () => {
      if (!__pixConfigObj) {
        const mod = await import('./pix-config.js');
        try {
          if (mod && mod.__tla && typeof mod.__tla.then === 'function') {
            await mod.__tla;
          }
        } catch (_) {}
        __pixConfigObj = (mod && mod.default) ? mod.default : mod;
      }
      return __pixConfigObj;
    };
    const factory = () => {
      if (__pixConfigObj) return __pixConfigObj;
      return {
        id: 'npwd_pix',
        nameLocale: 'Banco • PIX',
        color: '#fff',
        backgroundColor: '#333',
        path: '/npwd_pix',
        icon: () => null,
        app: () => null,
        notificationIcon: () => null
      };
    };
    factory.then = (onFulfilled, onRejected) => {
      return ensure().then(() => onFulfilled && onFulfilled(factory)).catch(onRejected);
    };
    factory.catch = (onRejected) => {
      return ensure().then(() => factory).catch(onRejected);
    };
    return factory;
  }
  throw new Error('Unknown module ' + path);
}

export { dynamicLoadingCss };
export { loadModule as get };
export const __tla = Promise.resolve();
