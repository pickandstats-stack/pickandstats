// Procesa los partidos de fases -> data/processed/<comp>/<temp>/fases.json
// Uso: node scraper/calcular-fases.js [--competicion 3] [--temporada 2025]
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

const DIR = path.join('data', 'raw', COMP_NOMBRE, TEMPORADA, '_fases');
const DIR_OUT = path.join('data', 'processed', COMP_NOMBRE, TEMPORADA);

if (!fs.existsSync(DIR)) {
  console.log(`No hay fases descargadas para ${COMP_NOMBRE} ${TEMPORADA} (falta ${DIR}).`);
  process.exit(0);
}

const limpiar = s => s.replace(/\s+/g, ' ').trim();

// Vocabulario de equipos: los nombres que aparecen sin ambiguedad (celdas con un
// solo ' - ') permiten desambiguar los equipos que llevan un guion en su nombre.
const VOCAB = new Set();
for (const carpeta of fs.readdirSync(DIR)) {
  const d = path.join(DIR, carpeta);
  for (const fi of fs.readdirSync(d)) {
    const q = JSON.parse(fs.readFileSync(path.join(d, fi), 'utf8'));
    const partes = limpiar(q.celdas?.[0] || '').split(' - ');
    if (partes.length === 2) { VOCAB.add(partes[0].trim()); VOCAB.add(partes[1].trim()); }
  }
}

function separarEquipos(bruto) {
  const pos = [];
  let i = bruto.indexOf(' - ');
  while (i >= 0) { pos.push(i); i = bruto.indexOf(' - ', i + 1); }
  let mejor = [bruto.slice(0, pos[pos.length-1]).trim(), bruto.slice(pos[pos.length-1] + 3).trim()];
  let mejorPuntos = -1;
  for (const p of pos) {
    const a = bruto.slice(0, p).trim(), b = bruto.slice(p + 3).trim();
    const puntos = (VOCAB.has(a) ? 1 : 0) + (VOCAB.has(b) ? 1 : 0);
    if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = [a, b]; }
  }
  return mejor;
}

const fases = {};
let totalPartidos = 0;

for (const carpeta of fs.readdirSync(DIR)) {
  const dirFase = path.join(DIR, carpeta);
  if (!fs.statSync(dirFase).isDirectory()) continue;

  for (const f of fs.readdirSync(dirFase)) {
    if (!f.endsWith('.json')) continue;
    const p = JSON.parse(fs.readFileSync(path.join(dirFase, f), 'utf8'));

    const brutoEquipos = limpiar(p.celdas?.[0] || '');
    let [local, visitante] = separarEquipos(brutoEquipos);

    const disputado = p.boxscore && p.boxscore.local && p.boxscore.local.length > 0;

    if (!fases[p.fase]) fases[p.fase] = { fase: p.fase, partidos: [] };
    fases[p.fase].partidos.push({
      id: p.id,
      jornada: p.jornada,
      fecha: limpiar(p.celdas?.[2] || ''),
      local, visitante,
      resultado: disputado ? p.resultado : null,
      disputado,
      cuartos: (p.boxscore && p.boxscore.cuartos) || [],
      boxscore: disputado ? { local: p.boxscore.local, visitante: p.boxscore.visitante } : null
    });
    totalPartidos++;
  }
}

const aFecha = s => {
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0);
};
const salida = Object.values(fases).map(f => ({
  ...f,
  partidos: f.partidos.sort((a, b) => aFecha(a.fecha) - aFecha(b.fecha))
})).sort((a, b) => a.fase.localeCompare(b.fase));

fs.mkdirSync(DIR_OUT, { recursive: true });
fs.writeFileSync(path.join(DIR_OUT, 'fases.json'), JSON.stringify(salida, null, 1));

console.log(`${COMP_NOMBRE} ${TEMPORADA} — Fases procesadas: ${salida.length} | Partidos: ${totalPartidos}`);
salida.forEach(f => {
  console.log(`\n  ${f.fase} (${f.partidos.length} partidos)`);
  f.partidos.forEach(p =>
    console.log(`    ${p.fecha} · ${p.local} ${p.resultado || 'vs'} ${p.visitante}`));
});
