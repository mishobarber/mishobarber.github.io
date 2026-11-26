import { db, configured, $, esc, WD, MO, ymOf, addM, monthTitle, monthGrid, BOOK_DAYS, pd, addD, fDate, money, today, ls, stepOf, svcsOf, barsOf, isOff, freeTimes, makeEntry, saveBooking, errText, poleSVG } from "./core.js";
import { doc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

$("#pole").innerHTML = poleSVG();
let cfg = null, cfgLoaded = false, taken = new Set();
const S = { svcs: [], bar: null, date: null, time: null, ym: null };
const svcs = () => svcsOf(cfg), bars = () => barsOf(cfg), step = () => stepOf(cfg);
const sel = () => svcs().filter(s => S.svcs.includes(s.id));
let mine = [];
try { mine = JSON.parse(ls.get("bs_mine") || "[]"); } catch (e) { mine = []; }

function renderHead() {
  $("#shopName").textContent = cfg?.name || "Բարբերշոփ";
  document.title = "Գրանցում · " + (cfg?.name || "Բարբերշոփ");
  const bits = [cfg?.address, cfg?.phone, cfg ? cfg.open + "–" + cfg.close : ""].filter(Boolean);
  $("#shopInfo").textContent = bits.join(" · ") || "Առցանց գրանցում";
}

function render() {
  const ready = cfg && svcs().length && bars().length;
  $("#flow").hidden = !ready;
  const nr = $("#notReady");
  nr.hidden = !!ready;
  if (!ready) {
    nr.textContent = !configured ? "Կայքը դեռ միացված չէ Firebase-ին (տես README.md)։" : !cfgLoaded ? "Բեռնվում է…" : "Առցանց գրանցումը շուտով կբացվի։";
    return;
  }
  S.svcs = S.svcs.filter(id => svcs().some(s => s.id === id));
  if (S.bar && !bars().some(b => b.id === S.bar)) S.bar = null;
  if (!S.bar && bars().length === 1) S.bar = bars()[0].id;

  $("#svcs").innerHTML = svcs().map(s => `<button class="opt" data-act="svc" data-v="${esc(s.id)}" aria-pressed="${S.svcs.includes(s.id)}"><b>${S.svcs.includes(s.id) ? "✓ " : ""}${esc(s.name)}</b><small>${step()} րոպե · ${esc(money(s.price))}</small></button>`).join("");
  $("#bars").innerHTML = bars().map(b => `<button class="opt bar" data-act="bar" data-v="${esc(b.id)}" aria-pressed="${S.bar === b.id}"><span class="ava">${esc((b.name || "?").trim().charAt(0))}</span><b>${esc(b.name)}</b></button>`).join("");

  const last = addD(today(), BOOK_DAYS - 1);
  const openDay = d => d >= today() && d <= last && !isOff(cfg, d);
  if (!S.date || !openDay(S.date)) { let d = today(); while (d <= last && !openDay(d)) d = addD(d, 1); S.date = d <= last ? d : null; }
  if (!S.ym) S.ym = ymOf(S.date || today());
  if (S.ym < ymOf(today())) S.ym = ymOf(today()); if (S.ym > ymOf(last)) S.ym = ymOf(last);
  $("#bmT").textContent = monthTitle(S.ym);
  $("#days").innerHTML = monthGrid(S.ym, (d, dn) => `<button class="cd ${d === today() ? "today" : ""}" data-act="day" data-v="${d}" aria-pressed="${S.date === d}" ${openDay(d) ? "" : "disabled"}><b>${dn}</b>${d === today() ? "<small>այսօր</small>" : ""}</button>`);
  $("#dayT").textContent = S.date ? fDate(S.date) : "";
  const sl = sel(), dur = sl.length * step(), total = sl.reduce((a, x) => a + (Number(x.price) || 0), 0);
  const one = bars().length === 1;
  $("#s2").hidden = one;
  [["#s1", 1], ["#s2", 2], ["#s3", one ? 2 : 3], ["#s4", one ? 3 : 4]].forEach(([id, n]) => $(id + " .n").textContent = n);
  $("#svcHint").textContent = sl.length ? `Ընտրված է ${sl.length} ծառայություն · ${dur} րոպե · ${money(total)}` : "Կարող եք ընտրել մի քանիսը";
  $("#s2").classList.toggle("off", !sl.length);
  $("#s3").classList.toggle("off", !sl.length || !S.bar);

  const ft = sl.length && S.bar ? freeTimes(cfg, taken, S.date, S.bar, dur) : [];
  if (S.time && !ft.includes(S.time)) S.time = null;
  $("#times").innerHTML = !sl.length || !S.bar ? '<div class="empty">Նախ ընտրեք ծառայությունը</div>'
    : ft.length ? `<div class="times">${ft.map(t => `<button class="tm" data-act="time" data-v="${t}" aria-pressed="${S.time === t}">${t}</button>`).join("")}</div>`
    : '<div class="empty">Այս օրը ազատ ժամեր չկան, ընտրեք այլ օր</div>';
  $("#s4").classList.toggle("off", !S.time);

  const bar = bars().find(b => b.id === S.bar);
  $("#summary").innerHTML = S.time && sl.length ? `<div class="ticket"><div class="t">${esc(S.time)} · ${esc(fDate(S.date))}</div><p style="margin-bottom:8px">Վարսավիր՝ ${esc(bar?.name)} · ${dur} րոպե</p>${sl.map(x => `<div class="kv"><span>${esc(x.name)}</span><b>${esc(money(x.price))}</b></div>`).join("")}<div class="kv total"><span>Ընդամենը</span><b>${esc(money(total))}</b></div></div>` : "";
}

function renderMine() {
  const up = mine.filter(e => e.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $("#mineBox").hidden = !up.length;
  const ph = cfg?.phone ? `Չեղարկելու համար զանգահարեք ${esc(cfg.phone)}` : "";
  $("#mine").innerHTML = up.map(e => `<div class="mi"><div><div class="t">${esc(e.time)} · ${esc(fDate(e.date))}</div><div style="color:var(--mute)">${esc(e.serviceName)} · ${esc(money(e.price))}</div></div></div>`).join("") + (ph && up.length ? `<p class="note">${ph}</p>` : "");
}

async function book() {
  const msg = $("#bookMsg"); msg.textContent = "";
  const sl = sel(), bar = bars().find(b => b.id === S.bar);
  const name = $("#cName").value.trim(), phone = $("#cPhone").value.trim();
  if (!sl.length || !bar || !S.date || !S.time) { msg.textContent = "Ընտրեք ծառայությունը և ժամը։"; return; }
  if (!name) { msg.textContent = "Գրեք ձեր անունը։"; $("#cName").focus(); return; }
  if (phone.replace(/\D/g, "").length < 8) { msg.textContent = "Գրեք ճիշտ հեռախոսահամար։"; $("#cPhone").focus(); return; }
  ls.set("bs_name", name); ls.set("bs_phone", phone);
  const btn = $("#bookBtn"); btn.setAttribute("aria-disabled", "true"); btn.textContent = "Պահպանվում է…";
  try {
    const e = await saveBooking(makeEntry(cfg, S.date, S.time, sl, bar, name, phone, "client"));
    mine = mine.filter(x => x.date >= today()); mine.push({ date: e.date, time: e.time, serviceName: e.serviceName, price: e.price });
    ls.set("bs_mine", JSON.stringify(mine)); renderMine();
    $("#okBody").innerHTML = [["Ժամ", e.time], ["Օր", fDate(e.date)], ["Վարսավիր", e.barberName], ["Տևողություն", e.dur + " րոպե"], ...e.items.map(x => [x.name, money(x.price)])]
      .map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")
      + `<div class="kv total"><span>Ընդամենը</span><b>${esc(money(e.price))}</b></div>`
      + (cfg?.address ? `<p class="note">${esc(cfg.address)}</p>` : "");
    $("#ov").hidden = false; S.time = null; S.svcs = []; render();
  } catch (x) { console.error(x); msg.textContent = errText(x, cfg); render(); }
  btn.removeAttribute("aria-disabled"); btn.textContent = "Գրանցվել";
}

document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, v = b.dataset.v;
  if (a === "svc") { S.svcs = S.svcs.includes(v) ? S.svcs.filter(x => x !== v) : [...S.svcs, v]; S.time = null; render(); }
  else if (a === "bar") { S.bar = v; S.time = null; render(); }
  else if (a === "bm") { S.ym = addM(S.ym, Number(v)); render(); }
  else if (a === "day") { S.date = v; S.time = null; render(); }
  else if (a === "time") { S.time = v; render(); $("#s4").scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (a === "book") book();
  else if (a === "okclose") $("#ov").hidden = true;
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape") $("#ov").hidden = true; });

$("#cName").value = ls.get("bs_name"); $("#cPhone").value = ls.get("bs_phone");
renderMine(); render();

if (db) {
  const timer = setTimeout(() => { if (!cfgLoaded) $("#notReady").textContent = "Չհաջողվեց բեռնել։ Ստուգեք ինտերնետը։"; }, 10000);
  onSnapshot(doc(db, "config", "main"), s => { clearTimeout(timer); cfgLoaded = true; cfg = s.exists() ? s.data() : null; renderHead(); render(); renderMine(); },
    e => { clearTimeout(timer); cfgLoaded = true; console.error(e); render(); });
  onSnapshot(query(collection(db, "slots"), where("date", ">=", today())), q => { taken = new Set(q.docs.map(d => d.id)); render(); }, e => console.error(e));
}
