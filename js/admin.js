import { app, db, configured, $, esc, WD, WDL, MO, ymOf, addM, monthTitle, monthGrid, pd, addD, money, today, toMin, stepOf, svcsOf, barsOf, isOff, freeTimes, makeEntry, saveBooking, errText, poleSVG, DEFAULT_CONFIG } from "./core.js";
import { doc, collection, query, where, onSnapshot, updateDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

$("#pole").innerHTML = poleSVG();
let cfg = null, rows = [], upcoming = [], taken = new Set(), draft = null, unsubDay = [], unsubUp = null;
const A = { tab: "list", date: today(), bar: "all", confirm: null, ym: ymOf(today()) };
const svcs = () => svcsOf(cfg), bars = () => barsOf(cfg), step = () => stepOf(cfg);

function note(t) { const n = $("#notReady"); n.hidden = !t; n.textContent = t || ""; }

/* ---------- overview ---------- */
function subscribeUpcoming() {
  if (unsubUp) return;
  unsubUp = onSnapshot(query(collection(db, "bookings"), where("date", ">=", ymOf(today()) + "-01")),
    q => { upcoming = q.docs.map(d => ({ ...d.data(), id: d.id })); renderStrip(); }, e => console.error(e));
}
const kfmt = n => n >= 1000 ? (Math.round(n / 100) / 10).toString().replace(/\.0$/, "") + "k" : String(n);
function renderStrip() {
  const act = upcoming.filter(e => e.status !== "cancel" && (A.bar === "all" || e.barber === A.bar));
  const by = {};
  act.forEach(e => { const v = by[e.date] ||= { n: 0, s: 0 }; v.n++; v.s += Number(e.price) || 0; });
  const month = ym => {
    const t = Object.entries(by).filter(([d]) => d.startsWith(ym)).reduce((a, [, v]) => ({ n: a.n + v.n, s: a.s + v.s }), { n: 0, s: 0 });
    return `<div class="cal-m"><h4>${monthTitle(ym)}<span>${t.n} հաճ. · ${esc(money(t.s))}</span></h4>` + monthGrid(ym, (d, dn) => {
      const v = by[d], off = isOff(cfg, d);
      return `<button class="cd ${v ? "has" : ""} ${d === today() ? "today" : ""} ${off && !v ? "mute" : ""}" data-act="apick" data-v="${d}" aria-pressed="${A.date === d}" aria-label="${dn} — ${v ? v.n + " հաճախորդ, " + money(v.s) : off ? "հանգիստ" : "ազատ"}"><b>${dn}</b>${v ? `<span class="n">${v.n}</span><small>${kfmt(v.s)} ֏</small>` : off ? "<small>հանգ.</small>" : ""}</button>`;
    }) + "</div>";
  };
  const t = Object.entries(by).filter(([d]) => d >= today()).reduce((a, [, v]) => ({ n: a.n + v.n, s: a.s + v.s }), { n: 0, s: 0 });
  $("#ovSum").textContent = `Առաջիկա՝ ${t.n} հաճ. · ${money(t.s)}`;
  $("#aStrip").innerHTML = month(A.ym) + month(addM(A.ym, 1));
}

/* ---------- day list ---------- */
function subscribeDay() {
  if (A.date >= ymOf(today()) && (ymOf(A.date) < A.ym || ymOf(A.date) > addM(A.ym, 1))) A.ym = ymOf(A.date);
  unsubDay.forEach(u => u()); unsubDay = [];
  rows = []; taken = new Set(); render();
  unsubDay.push(onSnapshot(query(collection(db, "bookings"), where("date", "==", A.date)),
    q => { rows = q.docs.map(d => ({ ...d.data(), id: d.id })); note(""); render(); },
    e => { console.error(e); if (e.code === "permission-denied") { note("Այս հաշիվը ադմինի իրավունք չունի։ Ստուգեք firestore.rules ֆայլի email-ը։"); $("#vAdmin").hidden = true; } }));
  unsubDay.push(onSnapshot(query(collection(db, "slots"), where("date", "==", A.date)),
    q => { taken = new Set(q.docs.map(d => d.id)); if (!$("#wForm").hidden) fillWalkTimes(); }, e => console.error(e)));
}

function render() {
  document.querySelectorAll(".tab[data-act=atab]").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === A.tab));
  $("#aList").hidden = A.tab !== "list"; $("#aSet").hidden = A.tab !== "set";
  if (A.tab !== "list") return;
  const d = pd(A.date);
  $("#aDate").textContent = (A.date === today() ? "Այսօր, " : "") + d.getDate() + " " + MO[d.getMonth()] + ", " + WDL[d.getDay()];
  const day = rows.filter(e => A.bar === "all" || e.barber === A.bar)
    .sort((a, b) => a.time.localeCompare(b.time) || (a.status === "cancel") - (b.status === "cancel"));
  const act = day.filter(e => e.status !== "cancel");
  $("#aPick").value = A.date;
  const sum = act.reduce((s, e) => s + (Number(e.price) || 0), 0), got = act.filter(e => e.status === "done").reduce((s, e) => s + (Number(e.price) || 0), 0);
  $("#aStats").innerHTML = [[act.length, "Հաճախորդ այս օրը"], [money(sum), "Եթե բոլորը գան"], [(() => { const n = act.filter(e => e.status === "done").length; return n ? n + " · " + money(got) : "0"; })(), "Արդեն եկել են"]]
    .map(([v, l]) => `<div class="st"><b>${esc(v)}</b><span>${l}</span></div>`).join("");
  $("#aChips").innerHTML = bars().length > 1 ? [["all", "Բոլորը"], ...bars().map(b => [b.id, b.name])]
    .map(([id, n]) => `<button class="tab" data-act="abar" data-v="${esc(id)}" aria-pressed="${A.bar === id}">${esc(n)}</button>`).join("") : "";
  let qn = 0;
  $("#aRows").innerHTML = day.length ? day.map(e => {
    const q = e.status === "cancel" ? "–" : ++qn;
    const st = e.status === "done" ? "is-done" : e.status === "cancel" ? "is-cancel" : "";
    const acts = e.status === "cancel" ? '<span class="tag" style="color:var(--mute)">Չեղարկված</span>'
      : `<button class="btn ghost" data-act="adone" data-v="${esc(e.id)}">${e.status === "done" ? "↺ Վերադարձնել" : "✓ Եկավ"}</button>`
        + (e.status === "done" ? "" : `<button class="btn ghost" data-act="acancel" data-v="${esc(e.id)}">${A.confirm === e.id ? "Հաստատե՞լ" : "✕ Չեղարկել"}</button>`);
    const tel = String(e.phone || "").replace(/[^\d+]/g, "");
    return `<div class="ar ${st}"><div class="t">${esc(e.time)}<small>${esc(e.dur)} ր</small></div><div class="who"><span class="q">${q}</span><b>${esc(e.name)}</b>${e.by === "admin" ? ' <span class="tag" style="color:var(--mute)">ադմին</span>' : ""}<div>${tel ? `<a href="tel:${esc(tel)}">${esc(e.phone)}</a>` : ""}</div><div>${esc(e.serviceName)} · ${esc(e.barberName)} · <b style="color:var(--ink)">${esc(money(e.price))}</b></div></div><div class="acts">${acts}</div></div>`;
  }).join("") : `<div class="empty" style="margin-top:12px">${isOff(cfg, A.date) ? "Հանգստյան օր է։" : "Այս օրը գրանցումներ դեռ չկան։"}</div>`;
}

/* ---------- walk-in ---------- */
const wSel = () => svcs().filter(s => [...document.querySelectorAll("#wSvc input:checked")].some(i => i.value === s.id));
function fillWalkTimes() {
  const n = wSel().length, ft = n ? freeTimes(cfg, taken, A.date, $("#wBar").value, n * step()) : [];
  $("#wTime").innerHTML = ft.length ? ft.map(t => `<option>${t}</option>`).join("") : `<option value="">${n ? "Ազատ ժամ չկա" : "Ընտրեք ծառայություն"}</option>`;
}
function openWalk() {
  if (!svcs().length || !bars().length) { A.tab = "set"; render(); renderSettings(); return; }
  $("#wSvc").innerHTML = svcs().map(s => `<label><input type="checkbox" value="${esc(s.id)}">${esc(s.name)} · ${esc(money(s.price))}</label>`).join("");
  $("#wBar").innerHTML = bars().map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("");
  $("#wBarBox").hidden = bars().length === 1;
  if (A.bar !== "all") $("#wBar").value = A.bar;
  fillWalkTimes(); $("#wMsg").textContent = ""; $("#wForm").hidden = false; $("#wBtn").hidden = true; $("#wName").focus();
}
async function saveWalk() {
  const m = $("#wMsg"); m.textContent = "";
  const sl = wSel(), bar = bars().find(b => b.id === $("#wBar").value), t = $("#wTime").value;
  const name = $("#wName").value.trim() || "Հաճախորդ", phone = $("#wPhone").value.trim();
  if (!sl.length) { m.textContent = "Ընտրեք ծառայություն։"; return; }
  if (!bar || !t) { m.textContent = "Ընտրեք ազատ ժամ։"; return; }
  try {
    await saveBooking(makeEntry(cfg, A.date, t, sl, bar, name, phone, "admin"));
    $("#wName").value = ""; $("#wPhone").value = ""; $("#wForm").hidden = true; $("#wBtn").hidden = false;
  } catch (x) { console.error(x); m.textContent = errText(x, cfg); fillWalkTimes(); }
}
async function cancelBooking(e) {
  const b = writeBatch(db);
  b.update(doc(db, "bookings", e.id), { status: "cancel" });
  for (const id of e.slots || []) b.delete(doc(db, "slots", id));
  await b.commit();
}

/* ---------- settings ---------- */
function renderSettings() {
  if (!draft) draft = JSON.parse(JSON.stringify(cfg || DEFAULT_CONFIG));
  draft.services ||= []; draft.barbers ||= []; draft.daysOff ||= [];
  const f = (k, l, t = "text") => `<div><label for="f_${k}">${l}</label><input id="f_${k}" type="${t}" data-f="${k}" value="${esc(draft[k])}"></div>`;
  $("#aSet").innerHTML = `
  ${cfg ? "" : '<div class="empty" style="margin-bottom:14px">Կարգավորումները դեռ պահված չեն։ Ստուգեք տվյալները և սեղմեք «Պահպանել» — դրանից հետո գրանցման էջը կբացվի։</div>'}
  <div class="panel"><h3>Սրահ</h3><div class="row2">${f("name", "Անվանում")}${f("phone", "Հեռախոս", "tel")}</div><div style="margin-top:12px">${f("address", "Հասցե")}</div></div>
  <div class="panel"><h3>Աշխատանքային ժամեր</h3><div class="row2">${f("open", "Բացվում է", "time")}${f("close", "Փակվում է", "time")}</div>
   <div style="margin-top:12px"><label for="f_step">Մեկ ծառայության տևողությունը</label><select id="f_step" data-f="step">${[15, 20, 25, 30, 40, 45, 60].map(n => `<option value="${n}" ${Number(draft.step) === n ? "selected" : ""}>${n} րոպե</option>`).join("")}</select></div>
   <div style="margin-top:12px"><label>Հանգստյան օրեր</label><div class="wk">${[1, 2, 3, 4, 5, 6, 0].map(i => `<label><input type="checkbox" data-off="${i}" ${draft.daysOff.includes(i) ? "checked" : ""}>${WD[i]}</label>`).join("")}</div></div></div>
  <div class="panel"><h3>Ծառայություններ</h3><div class="ed"><div class="hd">Անվանում</div><div class="hd">Գին, ֏</div><div></div></div>
   ${draft.services.map((s, i) => `<div class="ed"><input aria-label="Անվանում" data-s="${i}" data-k="name" value="${esc(s.name)}"><input aria-label="Գին" type="number" inputmode="numeric" data-s="${i}" data-k="price" value="${esc(s.price)}"><button class="x" data-act="sdel" data-v="${i}" aria-label="Ջնջել">×</button></div>`).join("")}
   <button class="btn ghost" data-act="sadd">+ Ծառայություն</button></div>
  <div class="panel"><h3>Վարսավիրներ</h3>
   ${draft.barbers.map((b, i) => `<div class="ed b"><input aria-label="Անուն" data-b="${i}" value="${esc(b.name)}"><button class="x" data-act="bdel" data-v="${i}" aria-label="Ջնջել">×</button></div>`).join("")}
   <button class="btn ghost" data-act="badd">+ Վարսավիր</button></div>
  <button class="btn big" data-act="cfgsave">Պահպանել</button><div class="msg" id="cfgMsg" role="status"></div>
  <p class="note">Փոփոխությունները հաճախորդները կտեսնեն անմիջապես։ Արդեն արված գրանցումները չեն փոխվում։</p>`;
}
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function saveCfg() {
  const m = $("#cfgMsg");
  const c = JSON.parse(JSON.stringify(draft));
  c.step = Number(c.step) || 25;
  c.services = c.services.filter(s => String(s.name || "").trim()).map(s => ({ id: s.id || "s" + rid(), name: String(s.name).trim(), price: Math.max(0, Number(s.price) || 0), dur: c.step }));
  c.barbers = c.barbers.filter(b => String(b.name || "").trim()).map(b => ({ id: b.id || "b" + rid(), name: String(b.name).trim() }));
  if (toMin(c.close) <= toMin(c.open)) { m.style.color = "var(--red)"; m.textContent = "Փակման ժամը պետք է լինի բացումից հետո։"; return; }
  m.style.color = "var(--mute)"; m.textContent = "Պահպանվում է…";
  try { await setDoc(doc(db, "config", "main"), c); draft = null; renderSettings(); $("#cfgMsg").style.color = "var(--ok)"; $("#cfgMsg").textContent = "Պահպանված է ✓"; }
  catch (x) { console.error(x); m.style.color = "var(--red)"; m.textContent = x.code === "permission-denied" ? "Իրավունք չկա (ստուգեք firestore.rules)։" : "Չստացվեց, փորձեք կրկին։"; }
}

/* ---------- events ---------- */
document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, v = b.dataset.v;
  if (a !== "acancel") A.confirm = null;
  if (a === "logout") signOut(getAuth(app));
  else if (a === "atab") { A.tab = v; if (v === "set") { draft = null; } render(); if (v === "set") renderSettings(); }
  else if (a === "aday") { A.date = v === "0" ? today() : addD(A.date, Number(v)); $("#wForm").hidden = true; $("#wBtn").hidden = false; subscribeDay(); renderStrip(); }
  else if (a === "abar") { A.bar = v; render(); renderStrip(); }
  else if (a === "cm") { A.ym = addM(A.ym, Number(v)); if (A.ym < ymOf(today())) A.ym = ymOf(today()); renderStrip(); }
  else if (a === "apick") { A.date = v; $("#wForm").hidden = true; $("#wBtn").hidden = false; subscribeDay(); renderStrip(); }
  else if (a === "adone") { const e = rows.find(x => x.id === v); if (e) try { await updateDoc(doc(db, "bookings", v), { status: e.status === "done" ? "new" : "done" }); } catch (x) { console.error(x); } }
  else if (a === "acancel") {
    if (A.confirm !== v) { A.confirm = v; render(); return; }
    A.confirm = null; const e = rows.find(x => x.id === v); if (e) try { await cancelBooking(e); } catch (x) { console.error(x); }
  }
  else if (a === "wopen") openWalk();
  else if (a === "wclose") { $("#wForm").hidden = true; $("#wBtn").hidden = false; }
  else if (a === "wsave") saveWalk();
  else if (a === "sadd") { draft.services.push({ id: "", name: "", price: "" }); renderSettings(); }
  else if (a === "sdel") { draft.services.splice(Number(v), 1); renderSettings(); }
  else if (a === "badd") { draft.barbers.push({ id: "", name: "" }); renderSettings(); }
  else if (a === "bdel") { draft.barbers.splice(Number(v), 1); renderSettings(); }
  else if (a === "cfgsave") saveCfg();
});
document.addEventListener("input", ev => {
  const t = ev.target; if (!draft || !t.closest("#aSet")) return;
  if (t.dataset.f) draft[t.dataset.f] = t.dataset.f === "step" ? Number(t.value) : t.value;
  else if (t.dataset.s !== undefined) draft.services[Number(t.dataset.s)][t.dataset.k] = t.value;
  else if (t.dataset.b !== undefined) draft.barbers[Number(t.dataset.b)].name = t.value;
  else if (t.dataset.off !== undefined) { const i = Number(t.dataset.off); draft.daysOff = draft.daysOff.filter(x => x !== i); if (t.checked) draft.daysOff.push(i); }
});
document.addEventListener("change", ev => {
  if (ev.target.id === "aPick" && ev.target.value) { A.date = ev.target.value; $("#wForm").hidden = true; $("#wBtn").hidden = false; subscribeDay(); renderStrip(); return; } if (ev.target.closest("#wSvc") || ev.target.id === "wBar") fillWalkTimes(); });

/* ---------- auth ---------- */
if (!configured) note("Կայքը դեռ միացված չէ Firebase-ին։ Լրացրեք js/firebase-config.js ֆայլը (տես README.md)։");
else {
  const auth = getAuth(app);
  $("#login").addEventListener("submit", async ev => {
    ev.preventDefault(); const m = $("#lMsg"); m.textContent = "Մուտք…";
    try { await signInWithEmailAndPassword(auth, $("#lEmail").value.trim(), $("#lPass").value); m.textContent = ""; }
    catch (x) { m.textContent = "Սխալ email կամ գաղտնաբառ։"; }
  });
  let started = false;
  onAuthStateChanged(auth, u => {
    $("#login").hidden = !!u; $("#vAdmin").hidden = !u; $("#logout").hidden = !u;
    if (!u) { note(""); unsubDay.forEach(f => f()); unsubDay = []; if (unsubUp) { unsubUp(); unsubUp = null; } return; }
    if (!started) {
      started = true;
      onSnapshot(doc(db, "config", "main"), s => {
        cfg = s.exists() ? s.data() : null;
        $("#shopName").textContent = (cfg?.name || "Բարբերշոփ") + " · Ադմին";
        if (!cfg && A.tab === "list") { A.tab = "set"; renderSettings(); }
        render(); renderStrip();
      }, e => console.error(e));
    }
    subscribeDay(); subscribeUpcoming();
  });
}
