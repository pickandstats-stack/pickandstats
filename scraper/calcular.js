// Cálculo de estadísticas (básicas + avanzadas) desde data/raw -> data/processed
// Agrega jugadores por licencia FEB (idJugador).
// Uso: node scraper/calcular.js [--competicion 3] [--temporada 2025]
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const args = process.argv.slice(2);
const leerArg = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const TEMPORADA = leerArg('--temporada') || CFG.TEMPORADA_DEFECTO;
const COMPETICION = leerArg('--competicion') || String(CFG.COMPETICION.id);
const COMP_NOMBRE = CFG.COMPETICIONES[COMPETICION];
if (!COMP_NOMBRE) {
  console.error(`Competición '${COMPETICION}' desconocida. Válidas: ${Object.keys(CFG.COMPETICIONES).join(', ')}`);
  process.exit(1);
}

const DIR_RAW = path.join('data', 'raw', COMP_NOMBRE, TEMPORADA);
const DIR_OUT = path.join('data', 'processed', COMP_NOMBRE, TEMPORADA);

// --- Identidad de club (data/clubes.json) ---------------------------------
// La FEB cambia el id de equipo cada temporada y los patrocinadores alteran el
// nombre, así que el club se identifica con un id propio y estable. El registro
// se regenera al empezar cada temporada con: node scraper/generar-clubes.js
const _partesOut = DIR_OUT.split(path.sep);
const _COMP = _partesOut[_partesOut.length - 2];
const _TEMP = _partesOut[_partesOut.length - 1];

const _norm = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase().replace(/[.'’`´]/g, '').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const _porNombreTemp = {}, _porNombre = {};
try {
  const reg = JSON.parse(fs.readFileSync(path.join('data', 'clubes.json'), 'utf8'));
  for (const c of reg.clubes) {
    for (const n of [c.nombre, ...(c.alias || [])]) {
      const k = _norm(n);
      if (_porNombre[k] === undefined) _porNombre[k] = c.id;
      else if (_porNombre[k] !== c.id) _porNombre[k] = null;   // ambiguo: hace falta temporada
      for (const ap of (c.apariciones || [])) _porNombreTemp[k + '|' + ap] = c.id;
    }
  }
} catch (e) {
  console.log('  ! Aviso: no se pudo leer data/clubes.json (' + e.message + '). Los equipos irán sin idClub.');
}

const _clubesDesconocidos = new Set();
function idClubDe(nombre) {
  const k = _norm(nombre);
  const exacto = _porNombreTemp[k + '|' + _COMP + ' ' + _TEMP];
  if (exacto) return exacto;
  if (_porNombre[k]) return _porNombre[k];
  _clubesDesconocidos.add(nombre);
  return null;
}
// --------------------------------------------------------------------------
if (!fs.existsSync(DIR_RAW)) {
  console.error(`No hay datos crudos en ${DIR_RAW}. ¿Has ejecutado el scraper para esta competición/temporada?`);
  process.exit(1);
}
fs.mkdirSync(DIR_OUT, { recursive: true });

// ---------- carga ----------
const partidos = [];
const excluidos = [];
for (const grupo of fs.readdirSync(DIR_RAW)) {
  const dirGrupo = path.join(DIR_RAW, grupo);
  if (!fs.statSync(dirGrupo).isDirectory()) continue;
  for (const f of fs.readdirSync(dirGrupo)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const p = JSON.parse(fs.readFileSync(path.join(dirGrupo, f), 'utf8'));
    const disputado = p.boxscore &&
      p.boxscore.local.length > 0 && p.boxscore.visitante.length > 0;
    if (!disputado) {
      excluidos.push({ id: p.id, grupo: p.grupo, jornada: p.jornada,
        partido: `${p.equipoLocal.nombre} vs ${p.equipoVisitante.nombre}`,
        resultado: p.resultado });
      continue;
    }
    partidos.push(p);
  }
}
console.log(`${COMP_NOMBRE} ${TEMPORADA} — Partidos cargados: ${partidos.length} | Excluidos: ${excluidos.length}`);

// ---------- utilidades ----------
const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
const numJornada = j => parseInt((j.match(/\d+/) || [0])[0], 10);
const r2 = x => Math.round(x * 100) / 100;
const r1 = x => Math.round(x * 10) / 10;

function totalesEquipo(box) {
  return {
    pt: sum(box, j => j.pt),
    t2a: sum(box, j => j.t2.a), t2i: sum(box, j => j.t2.i),
    t3a: sum(box, j => j.t3.a), t3i: sum(box, j => j.t3.i),
    tla: sum(box, j => j.tl.a), tli: sum(box, j => j.tl.i),
    ro: sum(box, j => j.ro), rd: sum(box, j => j.rd),
    as: sum(box, j => j.as), br: sum(box, j => j.br), bp: sum(box, j => j.bp),
    tf: sum(box, j => j.tf), tco: sum(box, j => j.tco),
    fc: sum(box, j => j.fc), seg: sum(box, j => j.seg)
  };
}
const tci = t => t.t2i + t.t3i;
const tca = t => t.t2a + t.t3a;
const posesiones = t => tci(t) - t.ro + t.bp + 0.44 * t.tli;

// ---------- agregación ----------
const equipos = {};
const jugadores = {};
const rivalesDe = {};

function initEquipo(id, nombre, grupo) {
  if (!equipos[id]) equipos[id] = { id, nombre, grupo, pj: 0, pg: 0,
    pf: 0, pc: 0, pos: 0, posRival: 0,
    t: { t2a:0,t2i:0,t3a:0,t3i:0,tla:0,tli:0,ro:0,rd:0,as:0,br:0,bp:0,tf:0,tco:0,fc:0,seg:0 },
    r: { t2a:0,t2i:0,t3a:0,t3i:0,tla:0,tli:0,ro:0,rd:0,bp:0,fc:0 },
    casa: { pj:0, pg:0 }, fuera: { pj:0, pg:0 }, resultados: [] };
  return equipos[id];
}

function acumular(eq, t, tRival, esLocal, gano, jor) {
  eq.pj++; if (gano) eq.pg++;
  eq.pf += t.pt; eq.pc += tRival.pt;
  eq.pos += posesiones(t); eq.posRival += posesiones(tRival);
  for (const k of Object.keys(eq.t)) eq.t[k] += t[k];
  for (const k of Object.keys(eq.r)) eq.r[k] += tRival[k];
  const split = esLocal ? eq.casa : eq.fuera;
  split.pj++; if (gano) split.pg++;
  eq.resultados.push({ jor, gano, dif: t.pt - tRival.pt });
}

function acumularJugador(j, equipoId, equipoNombre, grupo, jornada, idPartido) {
  const idJ = j.idJugador || `sin-id:${j.nombre}`;
  const clave = `${idJ}|${equipoId}`;
  if (!jugadores[clave]) jugadores[clave] = { idJugador: idJ, nombre: j.nombre, dorsal: j.dorsal,
    equipoId, equipo: equipoNombre, grupo, pj: 0, titular: 0, seg: 0,
    pt:0, t2a:0,t2i:0,t3a:0,t3i:0,tla:0,tli:0, ro:0,rd:0,rt:0,as:0,br:0,bp:0,
    tf:0,tco:0,fc:0,fr:0,va:0,pm:0, partidos: [] };
  const J = jugadores[clave];
  J.pj++; if (j.titular) J.titular++;
  J.seg += j.seg; J.pt += j.pt;
  J.t2a += j.t2.a; J.t2i += j.t2.i; J.t3a += j.t3.a; J.t3i += j.t3.i;
  J.tla += j.tl.a; J.tli += j.tl.i;
  J.ro += j.ro; J.rd += j.rd; J.rt += j.rt; J.as += j.as; J.br += j.br; J.bp += j.bp;
  J.tf += j.tf; J.tco += j.tco; J.fc += j.fc; J.fr += j.fr; J.va += j.va; J.pm += j.pm;
  J.partidos.push({ id: idPartido, jornada, pt: j.pt, va: j.va, seg: j.seg });
}

for (const p of partidos) {
  const tL = totalesEquipo(p.boxscore.local);
  const tV = totalesEquipo(p.boxscore.visitante);
  const [gL, gV] = p.resultado.split('-').map(Number);
  const jor = numJornada(p.jornada);
  const eqL = initEquipo(p.equipoLocal.id, p.equipoLocal.nombre, p.grupo);
  const eqV = initEquipo(p.equipoVisitante.id, p.equipoVisitante.nombre, p.grupo);
  acumular(eqL, tL, tV, true, gL > gV, jor);
  acumular(eqV, tV, tL, false, gV > gL, jor);
  (rivalesDe[eqL.id] = rivalesDe[eqL.id] || []).push(eqV.id);
  (rivalesDe[eqV.id] = rivalesDe[eqV.id] || []).push(eqL.id);
  p.boxscore.local.forEach(j => acumularJugador(j, p.equipoLocal.id, p.equipoLocal.nombre, p.grupo, p.jornada, p.id));
  p.boxscore.visitante.forEach(j => acumularJugador(j, p.equipoVisitante.id, p.equipoVisitante.nombre, p.grupo, p.jornada, p.id));
}

// ---------- SRS ----------
const net = {};
for (const e of Object.values(equipos))
  net[e.id] = 100 * e.pf / e.pos - 100 * e.pc / e.posRival;
let srs = { ...net };
for (let iter = 0; iter < 50; iter++) {
  const nuevo = {};
  for (const id of Object.keys(srs)) {
    const opps = rivalesDe[id] || [];
    const sos = opps.length ? opps.reduce((a, o) => a + srs[o], 0) / opps.length : 0;
    nuevo[id] = net[id] + sos;
  }
  srs = nuevo;
}

// ---------- salida equipos ----------
const salidaEquipos = Object.values(equipos).map(e => {
  const t = e.t, r = e.r;
  const ultimos5 = e.resultados.sort((a, b) => a.jor - b.jor).slice(-5);
  const v5 = ultimos5.filter(x => x.gano).length;
  const E = 10.25;
  const pfE = Math.pow(e.pf, E), pcE = Math.pow(e.pc, E);
  const victoriasEsperadas = e.pj * pfE / (pfE + pcE);
  return {
    id: e.id, idClub: idClubDe(e.nombre), nombre: e.nombre, grupo: e.grupo,
    pj: e.pj, pg: e.pg, pp: e.pj - e.pg,
    pf: e.pf, pc: e.pc,
    casa: e.casa, fuera: e.fuera,
    pfPartido: r1(e.pf / e.pj),
    pcPartido: r1(e.pc / e.pj),
    difPartido: r1((e.pf - e.pc) / e.pj),
    t2PctEq: r2(100 * t.t2a / t.t2i),
    t3PctEq: r2(100 * t.t3a / t.t3i),
    tlPctEq: r2(100 * t.tla / t.tli),
    roPartido: r1(t.ro / e.pj),
    rdPartido: r1(t.rd / e.pj),
    rebPartido: r1((t.ro + t.rd) / e.pj),
    asPartido: r1(t.as / e.pj),
    brPartido: r1(t.br / e.pj),
    bpPartido: r1(t.bp / e.pj),
    fcPartido: r1(t.fc / e.pj),
    frPartido: r1(r.fc / e.pj),
    tapFavor: r1(t.tf / e.pj),
    tapContra: r1(t.tco / e.pj),
    pace: r2(e.pos / e.pj),
    ortg: r2(100 * e.pf / e.pos),
    drtg: r2(100 * e.pc / e.posRival),
    netrtg: r2(net[e.id]),
    srs: r2(srs[e.id]),
    efg: r2(100 * (tca(t) + 0.5 * t.t3a) / tci(t)),
    tovPct: r2(100 * t.bp / e.pos),
    orbPct: r2(100 * t.ro / (t.ro + r.rd)),
    ftRate: r2(100 * t.tla / tci(t)),
    ts: r2(100 * e.pf / (2 * (tci(t) + 0.44 * t.tli))),
    t3Pct: r2(100 * t.t3a / t.t3i),
    t3ar: r2(100 * t.t3i / tci(t)),
    astPct: r2(100 * t.as / tca(t)),
    asPorBp: r2(t.as / t.bp),
    pct2: r1(100 * 2 * t.t2a / e.pf),
    pct3: r1(100 * 3 * t.t3a / e.pf),
    pctTl: r1(100 * t.tla / e.pf),
    efgRival: r2(100 * (tca(r) + 0.5 * r.t3a) / tci(r)),
    tovForzadas: r2(100 * r.bp / e.posRival),
    drbPct: r2(100 * t.rd / (t.rd + r.ro)),
    ftrRival: r2(100 * r.tla / tci(r)),
    forma5: `${v5}-${ultimos5.length - v5}`,
    forma5Dif: r1(ultimos5.reduce((a, x) => a + x.dif, 0) / (ultimos5.length || 1)),
    victoriasEsperadas: r1(victoriasEsperadas),
    suerte: r1(e.pg - victoriasEsperadas)
  };
}).sort((a, b) => a.grupo.localeCompare(b.grupo) || b.netrtg - a.netrtg);

// ---------- salida jugadores ----------
function filaJugador(J) {
  const min = J.seg / 60;
  const tciJ = J.t2i + J.t3i;
  const tcaJ = J.t2a + J.t3a;
  const eq = equipos[J.equipoId];
  const usg = min > 0 && eq ? 100 * ((tciJ + 0.44 * J.tli + J.bp) * (eq.t.seg / 60 / 5)) /
    (min * (tci(eq.t) + 0.44 * eq.t.tli + eq.t.bp)) : 0;
  const per36 = v => min > 0 ? r2(v * 36 / min) : 0;
  const porPartido = v => r2(v / J.pj);
  return {
    idJugador: J.idJugador,
    nombre: J.nombre, dorsal: J.dorsal, equipo: J.equipo, equipoId: J.equipoId, grupo: J.grupo,
    pj: J.pj, titular: J.titular, minTotales: r2(min), minPorPartido: r2(min / J.pj),
    pt: J.pt, ro: J.ro, rd: J.rd, rt: J.rt, as: J.as, br: J.br, bp: J.bp,
    tfTot: J.tf, tcoTot: J.tco, fcTot: J.fc, frTot: J.fr, va: J.va, pm: J.pm,
    t2a: J.t2a, t2i: J.t2i, t3a: J.t3a, t3i: J.t3i, tla: J.tla, tli: J.tli,
    ptPorPartido: porPartido(J.pt),
    roPorPartido: porPartido(J.ro),
    rdPorPartido: porPartido(J.rd),
    rtPorPartido: porPartido(J.rt),
    asPorPartido: porPartido(J.as),
    brPorPartido: porPartido(J.br),
    bpPorPartido: porPartido(J.bp),
    tpPorPartido: porPartido(J.tf),
    tcoPorPartido: porPartido(J.tco),
    fcPorPartido: porPartido(J.fc),
    frPorPartido: porPartido(J.fr),
    vaPorPartido: porPartido(J.va),
    t2: `${J.t2a}/${J.t2i}`,
    t3: `${J.t3a}/${J.t3i}`,
    tl: `${J.tla}/${J.tli}`,
    t2Pct: J.t2i > 0 ? r2(100 * J.t2a / J.t2i) : 0,
    t3Pct: J.t3i > 0 ? r2(100 * J.t3a / J.t3i) : 0,
    tlPct: J.tli > 0 ? r2(100 * J.tla / J.tli) : 0,
    ts: tciJ + 0.44 * J.tli > 0 ? r2(100 * J.pt / (2 * (tciJ + 0.44 * J.tli))) : 0,
    efg: tciJ > 0 ? r2(100 * (tcaJ + 0.5 * J.t3a) / tciJ) : 0,
    usg: r2(usg),
    per36: { pt: per36(J.pt), rt: per36(J.rt), as: per36(J.as), br: per36(J.br), va: per36(J.va) },
    evolucion: J.partidos
  };
}
const salidaJugadores = Object.values(jugadores).map(filaJugador)
  .sort((a, b) => b.vaPorPartido - a.vaPorPartido);

// ---------- percentiles (nacional y por grupo) ----------
const MIN_PJ_PCT = 12;
const METRICAS_PCT = ['ptPorPartido','rtPorPartido','asPorPartido','brPorPartido','vaPorPartido','ts','efg','t3Pct'];

function percentilEn(valoresOrdenados, v) {
  if (!valoresOrdenados.length) return null;
  let n = 0;
  for (const x of valoresOrdenados) { if (x <= v) n++; else break; }
  return Math.round(100 * n / valoresOrdenados.length);
}

const elegiblesPct = salidaJugadores.filter(j => j.pj >= MIN_PJ_PCT);
const ordNacional = {};
const ordGrupo = {};
for (const m of METRICAS_PCT) {
  ordNacional[m] = elegiblesPct.map(j => j[m]).sort((a, b) => a - b);
}
for (const j of elegiblesPct) {
  if (!ordGrupo[j.grupo]) ordGrupo[j.grupo] = {};
}
for (const g of Object.keys(ordGrupo)) {
  const delGrupo = elegiblesPct.filter(j => j.grupo === g);
  for (const m of METRICAS_PCT) {
    ordGrupo[g][m] = delGrupo.map(j => j[m]).sort((a, b) => a - b);
  }
}

for (const j of salidaJugadores) {
  if (j.pj < MIN_PJ_PCT) { j.percentiles = null; continue; }
  const pct = {};
  for (const m of METRICAS_PCT) {
    pct[m] = {
      nac: percentilEn(ordNacional[m], j[m]),
      grp: percentilEn(ordGrupo[j.grupo][m], j[m])
    };
  }
  j.percentiles = pct;
}

// ---------- carreras ----------
const porLicencia = {};
for (const fila of salidaJugadores) {
  const id = fila.idJugador;
  if (!porLicencia[id]) porLicencia[id] = { idJugador: id, nombre: fila.nombre, etapas: [] };
  porLicencia[id].etapas.push(fila);
}
const carreras = Object.values(porLicencia).map(c => {
  const tot = k => c.etapas.reduce((a, e) => a + e[k], 0);
  const pj = tot('pj');
  const min = tot('minTotales');
  const t2a = tot('t2a'), t2i = tot('t2i'), t3a = tot('t3a'), t3i = tot('t3i');
  const tla = tot('tla'), tli = tot('tli');
  const pt = tot('pt');
  const tciC = t2i + t3i, tcaC = t2a + t3a;
  const pp = k => r2(tot(k) / pj);
  const etapaPrincipal = c.etapas.reduce((a, b) => (b.pj > a.pj ? b : a), c.etapas[0]);
  return {
    idJugador: c.idJugador,
    nombre: c.nombre,
    equipos: c.etapas.map(e => `${e.equipo} (${e.grupo})`),
    nEtapas: c.etapas.length,
    percentiles: etapaPrincipal.percentiles || null,
    pj,
    minPorPartido: r2(min / pj),
    ptPorPartido: pp('pt'),
    roPorPartido: pp('ro'),
    rdPorPartido: pp('rd'),
    rtPorPartido: pp('rt'),
    asPorPartido: pp('as'),
    brPorPartido: pp('br'),
    bpPorPartido: pp('bp'),
    tpPorPartido: pp('tfTot'),
    tcoPorPartido: pp('tcoTot'),
    fcPorPartido: pp('fcTot'),
    frPorPartido: pp('frTot'),
    vaPorPartido: pp('va'),
    pm: tot('pm'),
    t2Pct: t2i > 0 ? r2(100 * t2a / t2i) : 0,
    t3Pct: t3i > 0 ? r2(100 * t3a / t3i) : 0,
    tlPct: tli > 0 ? r2(100 * tla / tli) : 0,
    ts: tciC + 0.44 * tli > 0 ? r2(100 * pt / (2 * (tciC + 0.44 * tli))) : 0,
    efg: tciC > 0 ? r2(100 * (tcaC + 0.5 * t3a) / tciC) : 0,
    etapas: c.etapas
  };
}).sort((a, b) => b.vaPorPartido - a.vaPorPartido);

const traspasados = carreras.filter(c => c.nEtapas > 1);

// ---------- partidos ----------
const salidaPartidos = partidos.map(p => ({
  id: p.id, grupo: p.grupo, jornada: p.jornada,
  local: p.equipoLocal, visitante: p.equipoVisitante, resultado: p.resultado,
  cuartos: (p.boxscore && p.boxscore.cuartos) || [],
  boxscore: p.boxscore ? { local: p.boxscore.local, visitante: p.boxscore.visitante } : null
}));

// ---------- escritura ----------
fs.writeFileSync(path.join(DIR_OUT, 'equipos.json'), JSON.stringify(salidaEquipos, null, 1));
fs.writeFileSync(path.join(DIR_OUT, 'jugadores.json'), JSON.stringify(salidaJugadores, null, 1));
fs.writeFileSync(path.join(DIR_OUT, 'carreras.json'), JSON.stringify(carreras, null, 1));
fs.writeFileSync(path.join(DIR_OUT, 'partidos.json'), JSON.stringify(salidaPartidos, null, 1));
fs.writeFileSync(path.join(DIR_OUT, 'excluidos.json'), JSON.stringify(excluidos, null, 1));

if (_clubesDesconocidos.size) {
  console.log('\n  ⚠ ' + _clubesDesconocidos.size + ' equipo(s) sin club en el registro:');
  [..._clubesDesconocidos].forEach(n => console.log('      ' + n));
  console.log('    Regenera el registro con: node scraper/generar-clubes.js');
}
const sinId = salidaJugadores.filter(j => String(j.idJugador).startsWith('sin-id:')).length;
console.log(`Equipos: ${salidaEquipos.length} | Filas jugador-equipo: ${salidaJugadores.length} | Licencias únicas: ${carreras.length}`);
console.log(`Jugadores con más de una etapa: ${traspasados.length} | Filas sin ID: ${sinId}`);
