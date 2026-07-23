const fs = require('fs'), path = require('path');
const base = 'data/processed';

for (const comp of fs.readdirSync(base)) {
  const pc = path.join(base, comp);
  if (!fs.statSync(pc).isDirectory()) continue;
  const temps = fs.readdirSync(pc).filter(t => fs.existsSync(path.join(pc, t, 'jugadores.json'))).sort();
  if (temps.length < 2) continue;

  const porTemp = {};
  for (const t of temps) {
    const j = JSON.parse(fs.readFileSync(path.join(pc, t, 'jugadores.json'), 'utf8'));
    porTemp[t] = (Array.isArray(j) ? j : Object.values(j));
  }

  console.log('\n### ' + comp + ' ###');
  for (let i = 0; i < temps.length - 1; i++) {
    const a = porTemp[temps[i]], b = porTemp[temps[i + 1]];
    const idsA = new Set(a.map(x => String(x.idJugador)));
    const comunesId = b.filter(x => idsA.has(String(x.idJugador))).length;

    const nom = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z ]/g,'').trim();
    const nomsA = new Set(a.map(x => nom(x.nombre)));
    const comunesNom = b.filter(x => nomsA.has(nom(x.nombre))).length;

    console.log('  ' + temps[i] + ' → ' + temps[i+1] +
      '   coinciden por ID: ' + String(comunesId).padStart(4) +
      '   por nombre: ' + String(comunesNom).padStart(4) +
      '   (plantillas de ' + a.length + ' y ' + b.length + ')');
  }
}

// ¿el histórico enlaza de verdad varias temporadas?
console.log('\n=== histórico: jugadores con más de una temporada ===');
for (const comp of fs.readdirSync(base)) {
  const fp = path.join(base, comp, 'historico.json');
  if (!fs.existsSync(fp)) continue;
  const h = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const lista = Array.isArray(h) ? h : Object.values(h);
  const multi = lista.filter(x => Object.keys(x.temporadas || {}).length > 1);
  console.log('  ' + comp.padEnd(12) + lista.length + ' jugadores · ' + multi.length + ' con 2+ temporadas');
  if (multi[0]) console.log('      ejemplo: ' + multi[0].nombre + ' → ' + Object.keys(multi[0].temporadas).join(', '));
}
