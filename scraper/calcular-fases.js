// Procesa los partidos de fases de ascenso -> data/processed/<temp>/fases.json
// Uso: node scraper/calcular-fases.js [--temporada 2025]
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? args[iT + 1] : '2025';

const DIR = path.join('data', 'raw', TEMPORADA, '_fases');
const DIR_OUT = path.join('data', 'processed', TEMPORADA);

if (!fs.existsSync(DIR)) {
  console.log(`No hay fases descargadas para ${TEMPORADA} (falta ${DIR}).`);
  process.exit(0);
}

const limpiar = s => s.replace(/\s+/g, ' ').trim();

const fases = {};
let totalPartidos = 0;

for (const carpeta of fs.readdirSync(DIR)) {
  const dirFase = path.join(DIR, carpeta);
  if (!fs.statSync(dirFase).isDirectory()) continue;

  for (const f of fs.readdirSync(dirFase)) {
    if (!f.endsWith('.json')) continue;
    const p = JSON.parse(fs.readFileSync(path.join(dirFase, f), 'utf8'));

    const brutoEquipos = limpiar(p.celdas?.[0] || '');
    const idx = brutoEquipos.lastIndexOf(' - ');
    let local = brutoEquipos, visitante = '';
    if (idx > 0) {
      local = brutoEquipos.slice(0, idx).trim();
      visitante = brutoEquipos.slice(idx + 3).trim();
    }

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

console.log(`Fases procesadas: ${salida.length} | Partidos: ${totalPartidos}`);
salida.forEach(f => {
  console.log(`\n  ${f.fase} (${f.partidos.length} partidos)`);
  f.partidos.forEach(p =>
    console.log(`    ${p.fecha} · ${p.local} ${p.resultado || 'vs'} ${p.visitante}`));
});
