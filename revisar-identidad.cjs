const fs = require('fs'), path = require('path');
const base = 'data/processed';

const porId = {}, porNombre = {};
for (const comp of fs.readdirSync(base)) {
  const pc = path.join(base, comp);
  if (!fs.statSync(pc).isDirectory()) continue;
  for (const temp of fs.readdirSync(pc)) {
    const fp = path.join(pc, temp, 'equipos.json');
    if (!fs.existsSync(fp)) continue;
    const e = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const x of (Array.isArray(e) ? e : Object.values(e))) {
      const id = String(x.id), nom = x.nombre || x.equipo;
      (porId[id] ||= []).push({ comp, temp, nom });
      (porNombre[nom] ||= new Set()).add(id);
    }
  }
}

console.log('Equipos-temporada cargados:', Object.values(porId).reduce((a,b)=>a+b.length,0));
console.log('IDs distintos:', Object.keys(porId).length, '\n');

// ¿un mismo ID cambia de nombre? -> el ID es estable y sirve de ancla
const renombrados = Object.entries(porId).filter(([, v]) => new Set(v.map(x => x.nom)).size > 1);
console.log('=== IDs que aparecen con VARIOS NOMBRES (' + renombrados.length + ') ===');
for (const [id, v] of renombrados) {
  console.log('  id ' + id);
  v.sort((a,b) => a.temp.localeCompare(b.temp))
   .forEach(x => console.log('      ' + x.temp + ' ' + x.comp.padEnd(12) + x.nom));
}

// ¿un mismo nombre tiene varios IDs? -> el ID NO sería fiable
const multiId = Object.entries(porNombre).filter(([, s]) => s.size > 1);
console.log('\n=== NOMBRES con VARIOS IDs (' + multiId.length + ') ===');
multiId.forEach(([n, s]) => console.log('  ' + n + '  ->  ' + [...s].join(', ')));

// ¿el ID se conserva al cambiar de categoría?
const multiComp = Object.entries(porId).filter(([, v]) => new Set(v.map(x => x.comp)).size > 1);
console.log('\n=== IDs presentes en VARIAS CATEGORÍAS (' + multiComp.length + ') ===');
multiComp.slice(0, 12).forEach(([id, v]) =>
  console.log('  id ' + id + '  ' + [...new Set(v.map(x => x.comp + ' ' + x.temp))].join(' · ') + '   (' + v[0].nom + ')'));
