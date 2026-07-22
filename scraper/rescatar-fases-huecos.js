// Rescate genérico de partidos de fases no enlazados por la FEB.
// Editar CASOS y lanzar. Los IDs se descubren con sondeos previos.
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const CASOS = [
  { comp: 'tercerafeb', temp: '2024', fase: 'FASE FINAL-A FFA1', jornada: 'Jornada 3',
    partidos: [ { id: '2470742' }, { id: '2470743' } ] },
];

function dirDeFase(comp, temp, fase) {
  const base = path.join('data', 'raw', comp, temp, '_fases');
  const slug = fase.replace(/[^A-Za-z0-9À-ÿ]+/g, '-').replace(/^-|-$/g, '');
  const norm = x => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fs.existsSync(base)) {
    const hallado = fs.readdirSync(base).find(d => norm(d) === norm(slug));
    if (hallado) return path.join(base, hallado);
  }
  return path.join(base, slug);
}

function parsearCuartos($) {
  const cuartos = [];
  $('.box-cuartos .nodo').each((i, nodo) => {
    const etiqueta = $(nodo).find('.cuarto').text().trim();
    const m = $(nodo).find('.marcador').text().trim().match(/(\d+)\s*\/\s*(\d+)/);
    if (m) cuartos.push({ periodo: etiqueta, local: +m[1], visitante: +m[2] });
  });
  return cuartos;
}

function parsearBoxscore($, tabla) {
  const jugadores = [];
  $(tabla).find('tr').each((i, tr) => {
    const c = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
    if (c.length < 20 || !c[2] || /jugador/i.test(c[2])) return;
    if (/total|equipo/i.test(c[2]) && !c[1]) return;
    const enlace = $(tr).find('a[href*="Jugador.aspx"]').attr('href') || '';
    const idJugador = (enlace.match(/[?&]c=(\d+)/) || [])[1] || null;
    const par = t => { const m = String(t).match(/(\d+)\/(\d+)/); return m ? { a: +m[1], i: +m[2] } : { a: 0, i: 0 }; };
    const seg = (t => { const m = String(t).match(/(\d+):(\d+)/); return m ? (+m[1]) * 60 + (+m[2]) : 0; })(c[3]);
    jugadores.push({
      idJugador, titular: c[0] === '*', dorsal: c[1], nombre: c[2], seg,
      pt: +c[4] || 0, t2: par(c[5]), t3: par(c[7]), tl: par(c[9]),
      ro: +c[11] || 0, rd: +c[12] || 0, rt: +c[13] || 0,
      as: +c[14] || 0, br: +c[15] || 0, bp: +c[16] || 0,
      tf: +c[17] || 0, tco: +c[18] || 0, fc: +c[19] || 0, fr: +c[20] || 0,
      va: +c[21] || 0, pm: +c[22] || 0
    });
  });
  return jugadores;
}

async function main() {
  for (const caso of CASOS) {
    const DIR = dirDeFase(caso.comp, caso.temp, caso.fase);
    fs.mkdirSync(DIR, { recursive: true });
    console.log('\n== ' + caso.comp + ' ' + caso.temp + ' · ' + caso.fase + ' ==');
    for (const p of caso.partidos) {
      const res = await axios.get(`${CFG.BASE}/Partido.aspx?p=${p.id}`, { headers: CFG.HEADERS, maxRedirects: 5 });
      const $ = cheerio.load(res.data);
      p.fecha = p.fecha || (String(res.data).match(/\d{2}\/\d{2}\/\d{4}/) || ['01/01/1900'])[0];
      const eq = [...new Set($('a[href*="Equipo.aspx"]').map((i, e) => $(e).text().trim()).get())];
      const local = eq[0] || 'LOCAL', visitante = eq[1] || 'VISITANTE';
      const tablas = $('table').toArray();
      const boxscore = { local: parsearBoxscore($, tablas[0]), visitante: parsearBoxscore($, tablas[1]), cuartos: parsearCuartos($) };
      const ptsL = boxscore.local.reduce((a, j) => a + j.pt, 0);
      const ptsV = boxscore.visitante.reduce((a, j) => a + j.pt, 0);
      const resultado = `${ptsL}-${ptsV}`;
      fs.writeFileSync(path.join(DIR, `${p.id}.json`), JSON.stringify({
        id: p.id, fase: caso.fase, jornada: `${caso.jornada || 'Jornada 2'}(${p.fecha})`, temporada: caso.temp,
        celdas: [`${local} -\n\t${visitante}`, resultado, p.fecha, ''], resultado, boxscore
      }, null, 1));
      console.log(`  ✔ ${p.id}  ${local} ${resultado} ${visitante}`);
    }
  }
}
main().catch(e => console.error('Error:', e.message));
