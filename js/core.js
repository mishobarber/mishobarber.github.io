import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, collection, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const configured = !String(firebaseConfig.apiKey || "").startsWith("PASTE");
export const app = configured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const WD = ["Կիր", "Երկ", "Երք", "Չրք", "Հնգ", "Ուրբ", "Շբթ"];
export const WDL = ["Կիրակի", "Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ"];
export const MO = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի", "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];
export const pad = n => String(n).padStart(2, "0");
export const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const pd = s => new Date(s + "T00:00:00");
export const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const toMin = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const toT = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
export const fDate = s => { const d = pd(s); return WDL[d.getDay()] + ", " + d.getDate() + " " + MO[d.getMonth()]; };
export const money = n => Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/ /g, " ") + " ֏";
export const today = () => ymd(new Date());
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const ls = {
  get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

export const stepOf = cfg => Math.max(10, Number(cfg?.step) || 25);
export const svcsOf = cfg => Array.isArray(cfg?.services) ? cfg.services : [];
export const barsOf = cfg => Array.isArray(cfg?.barbers) ? cfg.barbers : [];
export const isOff = (cfg, ds) => (cfg?.daysOff || []).includes(pd(ds).getDay());

export function slotIds(cfg, date, time, bar, dur) {
  const st = stepOf(cfg), n = Math.max(1, Math.ceil((Number(dur) || st) / st)), o = [];
  for (let i = 0; i < n; i++) o.push(date + "_" + toT(toMin(time) + i * st).replace(":", "-") + "_" + bar);
  return o;
}

// taken: Set of slot ids
export function freeTimes(cfg, taken, date, bar, dur) {
  if (!cfg || !date || !bar || isOff(cfg, date)) return [];
  const st = stepOf(cfg), o = toMin(cfg.open || "10:00"), c = toMin(cfg.close || "20:00"), d = Number(dur) || st, out = [];
  const lim = date === today() ? nowMin() + 10 : -1;
  for (let m = o; m + d <= c; m += st) {
    if (m <= lim) continue;
    const t = toT(m);
    if (slotIds(cfg, date, t, bar, d).every(id => !taken.has(id))) out.push(t);
  }
  return out;
}

export function makeEntry(cfg, date, time, sel, bar, name, phone, by) {
  const dur = sel.length * stepOf(cfg);
  return {
    date, time, barber: bar.id, barberName: bar.name,
    service: sel.map(x => x.id).join(","), serviceName: sel.map(x => x.name).join(", "),
    items: sel.map(x => ({ name: x.name, price: Number(x.price) || 0 })),
    price: sel.reduce((a, x) => a + (Number(x.price) || 0), 0),
    dur, name, phone, status: "new", by, created: Date.now(),
    slots: slotIds(cfg, date, time, bar.id, dur)
  };
}

// Writes the booking and all its time slots in one atomic batch.
// If any slot is already taken, Firestore rules reject the whole batch.
export async function saveBooking(entry) {
  const b = writeBatch(db);
  const ref = doc(collection(db, "bookings"));
  entry.id = ref.id;
  b.set(ref, entry);
  for (const id of entry.slots) b.set(doc(db, "slots", id), { date: entry.date, bk: ref.id });
  await b.commit();
  return entry;
}

export function errText(e, cfg) {
  const c = e?.code || "";
  if (c === "permission-denied") return "Այս ժամն արդեն զբաղված է, ընտրեք մեկ ուրիշը։";
  if (c === "unavailable") return "Ինտերնետ կապ չկա, փորձեք կրկին։";
  return "Չստացվեց, փորձեք կրկին։" + (cfg?.phone ? " Կամ զանգահարեք " + cfg.phone : "");
}

export function poleSVG() {
  return `<svg class="pole" viewBox="0 0 64 150" aria-hidden="true"><defs><pattern id="pp" width="40" height="48" patternUnits="userSpaceOnUse" patternTransform="skewY(-32)"><rect width="40" height="48" fill="#fff"/><rect width="40" height="16" fill="#d71f2b"/><rect y="24" width="40" height="8" fill="#2350e6"/></pattern><clipPath id="glass"><rect x="18" y="26" width="28" height="98" rx="4"/></clipPath><linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs><circle cx="32" cy="11" r="9" fill="#f3f1ee"/><circle cx="29" cy="8" r="3" fill="#fff"/><rect x="12" y="18" width="40" height="10" rx="3" fill="#16161a"/><g clip-path="url(#glass)"><g class="stripes"><rect width="64" height="200" fill="url(#pp)"/></g><rect x="18" y="26" width="28" height="98" fill="url(#sh)"/></g><rect x="12" y="122" width="40" height="10" rx="3" fill="#16161a"/><rect x="22" y="132" width="20" height="14" rx="3" fill="#16161a"/></svg>`;
}

export const DEFAULT_CONFIG = {
  name: "Misho Barber", address: "Երևան", phone: "+374 99 000000",
  open: "10:00", close: "20:00", step: 25, daysOff: [0],
  services: [
    { id: "s1", name: "Տղամարդու սանրվածք", price: 5000, dur: 25 },
    { id: "s2", name: "Մորուքի ձևավորում", price: 3000, dur: 25 },
    { id: "s3", name: "Մանկական սանրվածք", price: 3500, dur: 25 },
    { id: "s4", name: "Լվացում և հարդարում", price: 2000, dur: 25 }
  ],
  barbers: [{ id: "b1", name: "Միշո" }]
};
