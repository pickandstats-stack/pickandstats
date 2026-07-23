// Registro de clubes con identificador propio y estable.
// La unidad de identidad es la APARICIÓN (nombre + competición + temporada),
// porque un mismo nombre puede ser el primer equipo y el filial a la vez.
// Uso: node scraper/generar-clubes.js
const fs = require('fs');
const path = require('path');

const BASE = path.join('data', 'processed');
const DEC = JSON.parse(fs.readFileSync(path.join('data', 'clubes-decisiones.json'), 'utf8'));
const SALIDA = path.join('data', 'clubes.json');

const sinAcentos = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizar = s => sinAcentos(s).toUpperCase()
  .replace(/[.'’`´]/g, '').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const pareceFilial = s => /\s"?B"?$/.test(normalizar(s)) || /\sII$/.test(normalizar(s));
const GENERICOS = new Set(['CLUB','CB','CBI','C','B','A','EB','BALONCESTO','BASQUET','BASKET','BTO','SD','SDP','CD','UD','UE','AD','AC','DE','DEL','LA','EL','LOS','LAS','ESPORTIU','DEPORTIVO','DEPORTIVA','SECCION','FUNDACION','FUNDACIO','PMD']);

// ---------- apariciones ----------
const apar = [];
for (const comp of fs.readdirSync(BASE)) {
  const pc = path.join(BASE, comp);
  if (!fs.statSync(pc).isDirectory()) continue;
  for (const temp of fs.readdirSync(pc)) {
    const fp = path.join(pc, temp, 'equipos.json');
    if (!fs.existsSync(fp)) continue;
    const e = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const x of (Array.isArray(e) ? e : Object.values(e))) {
      const nombre = x.nombre || x.equipo;
      apar.push({ clave: nombre + ' @ ' + comp + ' ' + temp, nombre, comp, temp });
    }
  }
}

// ---------- resolver referencias ----------
function resolver(ref) {
  const i = ref.indexOf(' @ ');
  if (i < 0) return apar.filter(a => normalizar(a.nombre) === normalizar(ref));
  const nom = normalizar(ref.slice(0, i));
  const [comp, temp] = ref.slice(i + 3).trim().split(/\s+/);
  return apar.filter(a => normalizar(a.nombre) === nom && a.comp === comp && a.temp === temp);
}

const padre = {};
const raiz = x => (padre[x] === undefined || padre[x] === x) ? (padre[x] = x) : (padre[x] = raiz(padre[x]));
const unir = (a, b) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) padre[ra] = rb; };
apar.forEach(a => raiz(a.clave));

// apariciones excluidas del agrupado automático por nombre
const sueltas = new Set();
for (const ref of (DEC.separaciones || [])) resolver(ref).forEach(a => sueltas.add(a.clave));

// 1) agrupar automáticamente por nombre normalizado
const porNombre = {};
for (const a of apar) if (!sueltas.has(a.clave)) (porNombre[normalizar(a.nombre)] ||= []).push(a);
for (const lista of Object.values(porNombre))
  for (let i = 1; i < lista.length; i++) unir(lista[0].clave, lista[i].clave);

// 2) fusiones confirmadas
const bloq = new Set((DEC.separados || []).map(([a, b]) => [normalizar(a), normalizar(b)].sort().join('|')));
let nf = 0, avisos = [];
for (const [ra, rb] of (DEC.fusiones || [])) {
  if (bloq.has([normalizar(ra.split(' @ ')[0]), normalizar(rb.split(' @ ')[0])].sort().join('|'))) continue;
  const A = resolver(ra), B = resolver(rb);
  if (!A.length || !B.length) { avisos.push('sin coincidencia: "' + ra + '"  /  "' + rb + '"'); continue; }
  unir(A[0].clave, B[0].clave); nf++;
}

// ---------- construir clubes ----------
const grupos = {};
for (const a of apar) (grupos[raiz(a.clave)] ||= []).push(a);

const idManual = {}, filialManual = new Set();
for (const [ref, id] of Object.entries(DEC.ids || {})) resolver(ref).forEach(a => idManual[a.clave] = id);
for (const ref of (DEC.filiales || [])) resolver(ref).forEach(a => filialManual.add(a.clave));

function idDe(nombres) {
  const l = [...nombres].map(n => normalizar(n).split(' '));
  const com = l[0].filter(t => l.every(x => x.includes(t)));
  const ut = com.filter(t => !GENERICOS.has(t) && t.length > 1);
  return (ut.length ? ut : com.length ? com : l[0]).join('-').toLowerCase()
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const clubes = [], usados = {}, duplicados = [];
for (const g of Object.values(grupos)) {
  const orden = g.slice().sort((a, b) => b.temp.localeCompare(a.temp));
  const nombres = [...new Set(g.map(x => x.nombre))];
  const filial = g.some(x => filialManual.has(x.clave)) || pareceFilial(orden[0].nombre);
  let id = g.map(x => idManual[x.clave]).find(Boolean) || idDe(nombres);
  usados[id] = (usados[id] || 0) + 1;
  if (usados[id] > 1) { const base = id; id += filial ? '-b' : '-' + usados[id]; duplicados.push({ base, id, nombre: orden[0].nombre }); }
  clubes.push({ id, nombre: orden[0].nombre, filial, alias: nombres.filter(n => n !== orden[0].nombre),
    apariciones: orden.map(a => a.comp + ' ' + a.temp) });
}
clubes.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(SALIDA, JSON.stringify({ generado: new Date().toISOString().slice(0, 10), clubes }, null, 1));

console.log(SALIDA + ': ' + clubes.length + ' clubes desde ' + apar.length + ' equipos-temporada');
console.log('   fusiones aplicadas: ' + nf + '  ·  con varios nombres: ' + clubes.filter(c => c.alias.length).length +
            '  ·  filiales: ' + clubes.filter(c => c.filial).length);
if (avisos.length) { console.log('\n=== REFERENCIAS QUE NO CASAN ==='); avisos.forEach(a => console.log('   ' + a)); }
if (duplicados.length) {
  console.log('\n=== IDs QUE NECESITARON DESEMPATE (revisar) ===');
  duplicados.forEach(d => console.log('   ' + d.id.padEnd(30) + d.nombre));
}
console.log('\n=== LOS CASOS QUE HEMOS DECIDIDO ===');
for (const b of ['fuenlabrada','zamora','melilla','andratx','valsequillo','telde'])
  clubes.filter(c => c.id.startsWith(b)).forEach(c =>
    console.log('   ' + c.id.padEnd(26) + (c.filial ? '[F] ' : '    ') + c.nombre + '  ·  ' + c.apariciones.join(' / ')));
