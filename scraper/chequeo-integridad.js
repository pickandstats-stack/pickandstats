// Chequeo de integridad de las fases descargadas.
// Detecta huecos de partidos que la FEB no enlaza, liguillas incompletas
// y nombres de equipo sin correspondencia en la liga regular.
// Uso: node scraper/chequeo-integridad.js
const fs = require('fs');
const path = require('path');

const limpiar = s => String(s).replace(/\s+/g, ' ').trim();
const norm = s => limpiar(s).toUpperCase();
const slug = s => norm(s).replace(/[^A-Z0-9À-Ÿ]+/g, '');

let avisos = 0;
const aviso = txt => { avisos++; console.log('   ⚠ ' + txt); };

// Rango de la ronda dentro de su cuadro, y "familia" (el cuadro al que pertenece)
function escalon(nombre) {
  const n = norm(nombre);
  let rango = null;
  if (/1\/8/.test(n)) rango = 1;
  else if (/1\/4/.test(n)) rango = 2;
  else if (/1\/2/.test(n)) rango = 3;
  else if (/FINAL/.test(n)) rango = 4;
  if (rango === null) return null;
  const familia = n.replace(/1\/[248]/g, '').replace(/FINAL/g, '').replace(/\s+/g, ' ').trim();
  return { rango, familia };
}

function descubrir() {
  const casos = [];
  const base = path.join('data', 'processed');
  if (!fs.existsSync(base)) return casos;
  for (const comp of fs.readdirSync(base)) {
    const pc = path.join(base, comp);
    if (!fs.statSync(pc).isDirectory()) continue;
    for (const temp of fs.readdirSync(pc)) {
      const pt = path.join(pc, temp);
      if (!fs.statSync(pt).isDirectory()) continue;
      if (fs.existsSync(path.join(pt, 'fases.json'))) casos.push({ comp, temp, dirProc: pt });
    }
  }
  return casos;
}

function analizarFase(fase) {
  const pares = {}, oponentes = {};
  for (const p of fase.partidos) {
    const a = norm(p.local), b = norm(p.visitante);
    (pares[[a, b].sort().join(' ||| ')] ||= []).push(p);
    (oponentes[a] ||= new Set()).add(b);
    (oponentes[b] ||= new Set()).add(a);
  }
  const esLiguilla = Object.values(oponentes).some(s => s.size > 1);
  return { pares, esLiguilla, equipos: Object.keys(oponentes) };
}

function ganadorDeCruce(partidos) {
  const jugados = partidos.filter(p => p.resultado);
  if (!jugados.length) return null;
  const vict = {}, glob = {};
  for (const p of jugados) {
    const [gl, gv] = p.resultado.split('-').map(Number);
    if (isNaN(gl) || isNaN(gv)) return null;
    const l = norm(p.local), v = norm(p.visitante);
    vict[gl > gv ? l : v] = (vict[gl > gv ? l : v] || 0) + 1;
    glob[l] = (glob[l] || 0) + gl;
    glob[v] = (glob[v] || 0) + gv;
  }
  const eq = Object.keys(glob);
  if (eq.length !== 2) return null;
  const tabla = jugados.length >= 3 ? vict : glob;
  const m0 = tabla[eq[0]] || 0, m1 = tabla[eq[1]] || 0;
  return m0 === m1 ? null : (m0 > m1 ? eq[0] : eq[1]);
}

// --- 1a pasada: tamaño típico de cruce por competición ---
const casos = descubrir();
const tamanos = {};
for (const { comp, dirProc } of casos) {
  for (const fase of JSON.parse(fs.readFileSync(path.join(dirProc, 'fases.json'), 'utf8'))) {
    const { pares, esLiguilla } = analizarFase(fase);
    if (esLiguilla) continue;
    for (const k of Object.keys(pares)) {
      tamanos[comp] ||= {};
      tamanos[comp][pares[k].length] = (tamanos[comp][pares[k].length] || 0) + 1;
    }
  }
}
const tipico = {};
for (const comp of Object.keys(tamanos)) {
  const total = Object.values(tamanos[comp]).reduce((a, b) => a + b, 0);
  const [mejor, veces] = Object.entries(tamanos[comp]).sort((a, b) => b[1] - a[1])[0];
  if (veces / total >= 0.8) tipico[comp] = +mejor;
}

// --- 2a pasada: chequeos ---
console.log('CHEQUEO DE INTEGRIDAD DE FASES\n' + '='.repeat(60));
for (const c of Object.keys(tipico)) console.log(`(en ${c} el cruce típico es de ${tipico[c]} partido(s))`);

for (const { comp, temp, dirProc } of casos) {
  console.log('\n### ' + comp + ' ' + temp + ' ###');
  const fases = JSON.parse(fs.readFileSync(path.join(dirProc, 'fases.json'), 'utf8'));

  // A. carpetas de fases vacías
  const dirRaw = path.join('data', 'raw', comp, temp, '_fases');
  if (fs.existsSync(dirRaw)) {
    const enProc = new Set(fases.map(f => slug(f.fase)));
    for (const carpeta of fs.readdirSync(dirRaw)) {
      const d = path.join(dirRaw, carpeta);
      if (!fs.statSync(d).isDirectory()) continue;
      const n = fs.readdirSync(d).filter(x => x.endsWith('.json')).length;
      if (n === 0) aviso('fase sin ningún partido descargado: "' + carpeta + '" (la FEB no los enlaza)');
      else if (!enProc.has(slug(carpeta))) aviso('carpeta "' + carpeta + '" con ' + n + ' partidos pero ausente de fases.json');
    }
  }

  // equipos de la liga regular
  let conocidos = null;
  try {
    const eq = JSON.parse(fs.readFileSync(path.join(dirProc, 'equipos.json'), 'utf8'));
    conocidos = new Set((Array.isArray(eq) ? eq : Object.values(eq)).map(e => norm(e.nombre || e.equipo)));
  } catch (e) { console.log('   · sin equipos.json: no se comprueban los nombres de equipo'); }
  const desconocidos = new Set();

  const cuadros = {};   // familia -> { rango -> {equipos, ganadores, fase} }

  for (const fase of fases) {
    const { pares, esLiguilla, equipos } = analizarFase(fase);
    for (const e of equipos) if (conocidos && !conocidos.has(e)) desconocidos.add(e);

    for (const p of fase.partidos) {
      if (!p.resultado) aviso(fase.fase + ': partido ' + p.id + ' sin resultado');
      else if (!p.boxscore) aviso(fase.fase + ': partido ' + p.id + ' sin boxscore');
      if (p.boxscoreIncompleto)
        aviso(fase.fase + ': ' + p.id + ' ' + p.local + ' vs ' + p.visitante +
              ' — la FEB publica el boxscore incompleto (marcador ' + p.resultado +
              ' por cuartos, ' + p.resultadoFeb + ' segun sus fichas): estadistica individual coja');
    }

    if (esLiguilla) {
      const n = equipos.length, esperados = n * (n - 1) / 2, hay = Object.keys(pares).length;
      if (hay < esperados)
        aviso(fase.fase + ': liguilla de ' + n + ' equipos con ' + hay + '/' + esperados +
              ' enfrentamientos (faltan ' + (esperados - hay) + ')');
      continue;
    }

    if (tipico[comp]) for (const [k, ps] of Object.entries(pares))
      if (ps.length < tipico[comp])
        aviso(fase.fase + ': ' + k.replace(' ||| ', ' vs ') + ' tiene ' + ps.length +
              ' partido(s); lo normal aquí son ' + tipico[comp]);

    const esc = escalon(fase.fase);
    if (esc) {
      const gan = new Set();
      for (const ps of Object.values(pares)) { const g = ganadorDeCruce(ps); if (g) gan.add(g); }
      (cuadros[esc.familia] ||= {})[esc.rango] = { fase: fase.fase, equipos: new Set(equipos), ganadores: gan };
    }
  }

  // B. continuidad: todo ganador de una ronda debe estar en la siguiente del mismo cuadro
  for (const [familia, rondas] of Object.entries(cuadros)) {
    const rangos = Object.keys(rondas).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < rangos.length - 1; i++) {
      const act = rondas[rangos[i]], sig = rondas[rangos[i + 1]];
      const ausentes = [...act.ganadores].filter(g => !sig.equipos.has(g));
      if (ausentes.length)
        aviso('ganan "' + act.fase + '" pero no aparecen en "' + sig.fase + '": ' + ausentes.join(', ') +
              '  → probable partido no enlazado');
    }
  }

  if (desconocidos.size)
    aviso('nombres sin correspondencia en equipos.json: ' + [...desconocidos].join(' / '));
}

console.log('\n' + '='.repeat(60));
console.log(avisos ? avisos + ' aviso(s) para revisar.' : 'Sin avisos: todo cuadra.');
