// Rescate puntual: los 2 partidos de la Jornada 3 de FASE FINAL-A FFA1
// que la FEB no enlaza en el listado pero existen por ID directo.
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const PARTIDOS = [
  { id: '2513651', local: 'C.B. TRES CANTOS', visitante: 'VELABASKET CB SUECA' },
  { id: '2513652', local: 'VÍTALY LA MAR BCBADAJOZ', visitante: 'PUJOL MOLLERUSSA' },
];
const FASE = 'FASE FINAL-A FFA1';
const JORNADA = 'Jornada 3(30/05/2026)';
const FECHA = '30/05/2026';
const DIR = path.join('data', 'raw', '2025', '_fases', 'FASE-FINAL-A-FFA1');

function parsearCuartos($) {
  const cuartos = [];
  $('.box-cuartos .nodo').each((i, nodo) => {
    const etiqueta = $(nodo).find('.cuarto').text().trim();
    const marcador = $(nodo).find('.marcador').text().trim();
    const m = marcador.match(/(\d+)\s*\/\s*(\d+)/);
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
  for (const p of PARTIDOS) {
    const res = await axios.get(`${CFG.BASE}/Partido.aspx?p=${p.id}`, {
      headers: CFG.HEADERS, maxRedirects: 5
    });
    const $ = cheerio.load(res.data);
    const tablas = $('table').toArray();
    const boxscore = {
      local: parsearBoxscore($, tablas[0]),
      visitante: parsearBoxscore($, tablas[1]),
      cuartos: parsearCuartos($)
    };
    const ptsL = boxscore.local.reduce((a, j) => a + j.pt, 0);
    const ptsV = boxscore.visitante.reduce((a, j) => a + j.pt, 0);
    const resultado = `${ptsL}-${ptsV}`;

    fs.writeFileSync(path.join(DIR, `${p.id}.json`), JSON.stringify({
      id: p.id, fase: FASE, jornada: JORNADA, temporada: '2025',
      celdas: [`${p.local} -\n\t${p.visitante}`, resultado, FECHA, ''],
      resultado, boxscore
    }, null, 1));
    console.log(`✔ ${p.local} ${resultado} ${p.visitante}`);
  }
}
main().catch(e => console.error('Error:', e.message));
