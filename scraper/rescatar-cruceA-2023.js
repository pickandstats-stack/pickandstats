// Rescate: cruce de segundos sede A (FF 2ºA1-2ºA2) temporada 2023, no enlazado por la FEB
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const ID = '2400233';
const FASE = 'FF 2ºA1-2ºA2 2ºA1-2ºA2';
const JORNADA = 'Jornada 1(12/05/2024)';
const FECHA = '12/05/2024';
const DIR = path.join('data', 'raw', '2023', '_fases', 'FF-2ºA1-2ºA2-2ºA1-2ºA2');

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
  const res = await axios.get(`${CFG.BASE}/Partido.aspx?p=${ID}`, { headers: CFG.HEADERS, maxRedirects: 5 });
  const $ = cheerio.load(res.data);
  const tablas = $('table').toArray();
  const boxscore = {
    local: parsearBoxscore($, tablas[0]),
    visitante: parsearBoxscore($, tablas[1]),
    cuartos: parsearCuartos($)
  };
  const ptsL = boxscore.local.reduce((a, j) => a + j.pt, 0);
  const ptsV = boxscore.visitante.reduce((a, j) => a + j.pt, 0);
  // nombres tomados de la cabecera de cada tabla si están disponibles
  const nombreLocal = $(tablas[0]).find('caption, th').first().text().trim() || 'Segundo FFA1';
  const nombreVis = $(tablas[1]).find('caption, th').first().text().trim() || 'Segundo FFA2';
  const resultado = `${ptsL}-${ptsV}`;
  fs.writeFileSync(path.join(DIR, `${ID}.json`), JSON.stringify({
    id: ID, fase: FASE, jornada: JORNADA, temporada: '2023',
    celdas: [`${nombreLocal} -\n\t${nombreVis}`, resultado, FECHA, ''],
    resultado, boxscore
  }, null, 1));
  console.log(`✔ ${nombreLocal} ${resultado} ${nombreVis}`);
  console.log(`  (jugadores local: ${boxscore.local.length}, visitante: ${boxscore.visitante.length})`);
}
main().catch(e => console.error('Error:', e.message));
