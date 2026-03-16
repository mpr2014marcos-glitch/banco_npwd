export async function importShared(moduleName) {
  const scope = globalThis.__federation_shared__ || {};
  const shared = scope.default || {};
  const mod = shared[moduleName];
  if (!mod) throw new Error(`Shared module "${moduleName}" not found`);
  const ver = Object.keys(mod)[0];
  const entry = mod[ver];
  if (!entry) throw new Error(`Shared module "${moduleName}" has no version entry`);
  if (typeof entry.get === 'function') {
    const factory = await entry.get();
    const m = factory && factory();
    return m?.default || m;
  }
  return entry?.default || entry;
}
