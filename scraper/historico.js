// Genera el índice histórico cruzando todas las temporadas de una competición.
// Lee data/processed/<competicion>/<temp>/jugadores.json y agrega por licencia.
// Salida: data/processed/<competicion>/historico.json
// Uso: node scraper/historico.js [--competicion 3]
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const args = process.argv.slice(2);
const leerArg = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const COMPETICION = leerArg('--competicion') || String(CFG.COMPETICION.id);
const COMP_NOMBRE = CFG.COMPETICIONES[COMPETICION];
if (!COMP_NOMBRE) {
  console.error(`Competición '${COMPETICION}' desconocida. Válidas: ${Object.keys(CFG.COMPETICIONES).join(', ')}`);
  process.exit(1);
}

const BASE = path.join('data', 'processed', COMP_NOMBRE);
const r2 = x => Math.round(x * 100) / 100;

if (!fs.existsSync(BASE)) {
  console.error(`No hay datos procesados en ${BASE}.`);
  process.exit(1);
}

const temporadas = fs.readdirSync(BASE)
  .filter(d => /^\d{4}$/.test(d) &&
    fs.existsSync(path.join(BASE, d, 'jugadores.json')))
  .sort();

console.log(`${COMP_NOMBRE} — Temporadas encontradas: ${temporadas.join(', ')}`);

const hist = {};

for (const temp of temporadas) {
  const jugadores = JSON.parse(
    fs.readFileSync(path.join(BASE, temp, 'jugadores.json'), 'utf8'));

  const porLic = {};
  for (const j of jugadores) {
    const id = j.idJugador;
    if (!porLic[id]) porLic[id] = { nombre: j.nombre, etapas: [] };
    porLic[id].etapas.push(j);
  }

  for (const [id, data] of Object.entries(porLic)) {
    const et = data.etapas;
    const tot = k => et.reduce((a, e) => a + (e[k] || 0), 0);
    const campos = {
      pj: tot('pj'), min: tot('minTotales'),
      pt: tot('pt'), ro: tot('ro'), rd: tot('rd'), rt: tot('rt'),
      as: tot('as'), br: tot('br'), bp: tot('bp'), va: tot('va'),
      tf: tot('tfTot'), tco: tot('tcoTot'), fc: tot('fcTot'), fr: tot('frTot'),
      t2a: tot('t2a'), t2i: tot('t2i'), t3a: tot('t3a'), t3i: tot('t3i'),
      tla: tot('tla'), tli: tot('tli')
    };

    if (!hist[id]) hist[id] = {
      idJugador: id, nombre: data.nombre, temporadas: {},
      _bruto: { pj:0,min:0,pt:0,ro:0,rd:0,rt:0,as:0,br:0,bp:0,va:0,
                tf:0,tco:0,fc:0,fr:0,t2a:0,t2i:0,t3a:0,t3i:0,tla:0,tli:0 },
      _temps: new Set()
    };
    hist[id].nombre = data.nombre;
    hist[id]._temps.add(temp);
    for (const k of Object.keys(campos)) hist[id]._bruto[k] += campos[k];

    hist[id].temporadas[temp] = lineaDesde(campos, et);
  }
}

function lineaDesde(c, etapas) {
  const pj = c.pj;
  const pp = v => pj ? r2(v / pj) : 0;
  const tciC = c.t2i + c.t3i, tcaC = c.t2a + c.t3a;
  return {
    equipos: etapas ? etapas.map(e => `${e.equipo} (${e.grupo})`) : [],
    grupos: etapas ? [...new Set(etapas.map(e => e.grupo))] : [],
    pj,
    minPorPartido: pp(c.min),
    ptPorPartido: pp(c.pt),
    roPorPartido: pp(c.ro),
    rdPorPartido: pp(c.rd),
    rtPorPartido: pp(c.rt),
    asPorPartido: pp(c.as),
    brPorPartido: pp(c.br),
    bpPorPartido: pp(c.bp),
    tpPorPartido: pp(c.tf),
    tcoPorPartido: pp(c.tco),
    fcPorPartido: pp(c.fc),
    frPorPartido: pp(c.fr),
    vaPorPartido: pp(c.va),
    t2Pct: c.t2i ? r2(100 * c.t2a / c.t2i) : 0,
    t3Pct: c.t3i ? r2(100 * c.t3a / c.t3i) : 0,
    tlPct: c.tli ? r2(100 * c.tla / c.tli) : 0,
    ts: (tciC + 0.44 * c.tli) ? r2(100 * c.pt / (2 * (tciC + 0.44 * c.tli))) : 0,
    efg: tciC ? r2(100 * (tcaC + 0.5 * c.t3a) / tciC) : 0
  };
}

const salida = Object.values(hist).map(h => {
  const nTemp = h._temps.size;
  const carrera = lineaDesde(h._bruto, null);
  carrera.nTemporadas = nTemp;
  return {
    idJugador: h.idJugador,
    nombre: h.nombre,
    temporadas: h.temporadas,
    carrera,
    nTemporadas: nTemp
  };
});

fs.writeFileSync(path.join(BASE, 'historico.json'), JSON.stringify(salida, null, 1));

const multi = salida.filter(h => h.nTemporadas > 1);
console.log(`Licencias totales: ${salida.length} | En más de una temporada: ${multi.length}`);
