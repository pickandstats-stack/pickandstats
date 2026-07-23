// Detecta clubes que cambian de nombre entre temporadas.
// La FEB asigna un id de equipo nuevo cada año, pero las licencias de jugador
// son estables: si dos equipos de temporadas consecutivas comparten plantilla,
// son el mismo club con otro patrocinador.
// Uso: node scraper/detectar-renombrados.js
const fs = require('fs');
const path = require('path');

const base = path.join('data', 'processed');
const UMBRAL = 0.34;   // proporción de plantilla compartida para considerarlo el mismo club

function plantillasPorEquipo(comp, temp) {
  const fp = path.join(base, comp, temp, 'jugadores.json');
  if (!fs.existsSync(fp)) return null;
  const js = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const lista = Array.isArray(js) ? js : Object.values(js);
  const campoEquipo = ['equipo', 'nombreEquipo', 'equipoNombre'].find(k => lista[0] && lista[0][k] != null);
  if (!campoEquipo) {
    console.log('   (no encuentro el campo de equipo en jugadores.json; claves: ' +
                Object.keys(lista[0] || {}).slice(0, 15).join(', ') + ')');
    return null;
  }
  const porEq = {};
  for (const j of lista) {
    const eq = String(j[campoEquipo]);
    (porEq[eq] ||= new Set()).add(String(j.idJugador));
  }
  return porEq;
}

let hallazgos = 0;
for (const comp of fs.readdirSync(base)) {
  const pc = path.join(base, comp);
  if (!fs.statSync(pc).isDirectory()) continue;
  const temps = fs.readdirSync(pc).filter(t => fs.existsSync(path.join(pc, t, 'jugadores.json'))).sort();
  if (temps.length < 2) continue;

  console.log('\n### ' + comp + ' ###');
  for (let i = 0; i < temps.length - 1; i++) {
    const A = plantillasPorEquipo(comp, temps[i]);
    const B = plantillasPorEquipo(comp, temps[i + 1]);
    if (!A || !B) continue;

    const soloA = Object.keys(A).filter(e => !(e in B));   // desaparecen
    const soloB = Object.keys(B).filter(e => !(e in A));   // aparecen

    for (const a of soloA) {
      let mejor = null;
      for (const b of soloB) {
        const comunes = [...A[a]].filter(x => B[b].has(x)).length;
        const prop = comunes / Math.min(A[a].size, B[b].size);
        if (prop >= UMBRAL && (!mejor || prop > mejor.prop)) mejor = { b, comunes, prop };
      }
      if (mejor) {
        hallazgos++;
        console.log('  ' + temps[i] + ' → ' + temps[i + 1] +
          '   "' + a + '"  ===  "' + mejor.b + '"' +
          '   (' + mejor.comunes + ' jugadores en común, ' + Math.round(mejor.prop * 100) + '%)');
      }
    }
  }
}
console.log('\n' + (hallazgos ? hallazgos + ' posible(s) renombramiento(s).' : 'Ningún renombramiento detectado.'));
