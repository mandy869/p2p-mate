import { normalizeOption } from "./catalog.js";
const DB_NAME = "p2pmate-db";
const DB_VERSION = 1;
const STORE = "history";
const LEGACY_KEY = "p2pmate.history.v1";
const BACKUP_VERSION = 1;

let dbPromise;

function openDB() {
  if (!("indexedDB" in globalThis)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("date", "date");
          store.createIndex("type", "type");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("No se pudo abrir la base de datos."));
      request.onblocked = () => reject(new Error("La base de datos está bloqueada por otra pestaña."));
    }).catch(() => null);
  }
  return dbPromise;
}

function localRead() {
  try { return JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]"); }
  catch { return []; }
}
function localWrite(items) { localStorage.setItem(LEGACY_KEY, JSON.stringify(items)); }
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Error de almacenamiento."));
  });
}
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("No se pudieron guardar los datos."));
    tx.onabort = () => reject(tx.error || new Error("La operación fue cancelada."));
  });
}

export async function initStorage() {
  const db = await openDB();
  if (!db) return { mode: "localStorage" };
  const tx = db.transaction(STORE, "readonly");
  const count = await requestResult(tx.objectStore(STORE).count());
  if (count === 0) {
    const legacy = localRead();
    if (legacy.length) {
      const writeTx = db.transaction(STORE, "readwrite");
      const compatible = legacy.filter(item => {
        try { normalizeOption(item.asset, "Opción de origen"); normalizeOption(item.currency, "Opción de referencia"); return true; }
        catch { return false; }
      });
      compatible.forEach((item, index) => writeTx.objectStore(STORE).put(normalizeRecord(item, index)));
      await transactionDone(writeTx);
    }
  }
  return { mode: "IndexedDB" };
}

function normalizeRecord(record, index = 0) {
  const now = new Date().toISOString();
  return {
    ...record,
    id: String(record.id || `import-${Date.now()}-${index}`),
    type: record.type === "real" ? "real" : "hypothetical",
    date: record.date || now,
    createdAt: record.createdAt || record.date || now,
    asset: normalizeOption(record.asset, "Opción de origen"),
    currency: normalizeOption(record.currency, "Opción de referencia"),
    note: String(record.note || "").slice(0, 500)
  };
}

export async function getHistory() {
  const db = await openDB();
  if (!db) return localRead().flatMap((item, index) => {
    try { return [normalizeRecord(item, index)]; }
    catch { return []; }
  });
  const tx = db.transaction(STORE, "readonly");
  const rows = await requestResult(tx.objectStore(STORE).getAll());
  // Oculta registros antiguos con activos/monedas fuera del catálogo cerrado.
  const supported = rows.filter(item => {
    try { normalizeOption(item.asset, "Opción de origen"); normalizeOption(item.currency, "Opción de referencia"); return true; }
    catch { return false; }
  });
  return supported.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function saveHistory(items) {
  if (!Array.isArray(items)) throw new Error("El historial debe ser una lista.");
  const clean = items.map((item, index) => normalizeRecord(item, index));
  const db = await openDB();
  if (!db) { localWrite(clean); return clean; }
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  clean.forEach(item => store.put(item));
  await transactionDone(tx);
  return clean;
}

export async function addRecord(record) {
  const now = new Date().toISOString();
  const item = normalizeRecord({ ...record, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`, date: now, createdAt: now });
  const db = await openDB();
  if (!db) { const all = localRead(); all.unshift(item); localWrite(all); return all; }
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).add(item);
  await transactionDone(tx);
  return getHistory();
}

export async function updateRecord(id, record) {
  const all = await getHistory();
  const existing = all.find(item => item.id === id);
  if (!existing) throw new Error("No se encontró el registro que quieres editar.");
  const updated = normalizeRecord({ ...existing, ...record, id, date: existing.date, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
  const db = await openDB();
  if (!db) { localWrite(all.map(item => item.id === id ? updated : item)); return getHistory(); }
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(updated);
  await transactionDone(tx);
  return getHistory();
}

export async function deleteRecord(id) {
  const db = await openDB();
  if (!db) { const rows = localRead().filter(item => item.id !== id); localWrite(rows); return rows; }
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await transactionDone(tx);
  return getHistory();
}

export async function createBackup() {
  return { app: "P2P Mate", backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), records: await getHistory() };
}

export async function restoreBackup(data) {
  if (!data || data.app !== "P2P Mate" || data.backupVersion !== BACKUP_VERSION || !Array.isArray(data.records)) {
    throw new Error("El archivo no es una copia de seguridad válida de P2P Mate.");
  }
  if (data.records.length > 10000) throw new Error("La copia contiene demasiados registros.");
  const clean = data.records.map((item, index) => {
    if (!item || typeof item !== "object" || !item.id || !item.asset || !item.currency || !Number.isFinite(Number(item.profit))) {
      throw new Error(`El registro ${index + 1} no tiene los campos mínimos.`);
    }
    return normalizeRecord(item, index);
  });
  await saveHistory(clean);
  return clean;
}
