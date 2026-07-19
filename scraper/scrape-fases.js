// Descarga los partidos de las fases de ascenso (todo lo que NO es Liga Regular).
// Guarda en data/raw/<temporada>/_fases/<grupo-slug>/ID.json
// Uso: node scraper/scrape-fases.js [--temporada 2025]
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const args = process.argv.slice(2);
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? args[iT + 1] : '2025';

const pausa = ms => new Promise(r => setTimeout(r, ms));
const slug = s => s.replace(/[^a-zA-Z0-9ºª]+/g, '-').replace(/^-|-$/g, '');

async function getConEstado(url, data) {
  const res = data
    ? await axios.post(url, new URLSearchParams(data), { headers: CFG.HEADERS })
    : await axios.get(url, { headers: CFG.HEADERS });
  return cheerio.load(res.data);
}

function extraerEstado($) {
  const estado = {};
  ['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION'].forEach(k => {
    const v = $(`input[name="${k}"]`).val();
    if (v) estado[k] = v;
  });
  return estado;
}

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
      idJugador,
      titular: c[0] === '*',
      dorsal: c[1], nombre: c[2], seg,
      pt: +c[4] || 0,
      t2: par(c[5]), t3: par(c[7]), tl: par(c[9]),
      ro: +c[11] || 0, rd: +c[12] || 0, rt: +c[13] || 0,
      as: +c[14] || 0, br: +c[15] || 0, bp: +c[16] || 0,
      tf: +c[17] || 0, tco: +c[18] || 0,
      fc: +c[19] || 0, fr: +c[20] || 0,
      va: +c[21] || 0, pm: +c[22] || 0
    });
  });
  return jugadores;
}

async function scrapePartido(idPartido) {
  const res = await axios.get(`${CFG.BASE}/Partido.aspx?p=${idPartido}`, { headers: CFG.HEADERS });
  const $ = cheerio.load(res.data);
  const tablas = $('table').toArray();
  return {
    local: parsearBoxscore($, tablas[0]),
    visitante: parsearBoxscore($, tablas[1]),
    cuartos: parsearCuartos($)
  };
}

// Extrae y guarda los partidos visibles en la vista actual ($) de una fase
async function guardarPartidosDeVista($, fase, dirFase, jornadaTexto, contador) {
  const ids = [...new Set(
    $('a[href*="Partido.aspx?p="]').map((_, a) =>
      ($(a).attr('href').match(/p=(\d+)/) || [])[1]).get().filter(Boolean)
  )];

  for (const id of ids) {
    contador.total++;
    const destino = path.join(dirFase, `${id}.json`);
    if (fs.existsSync(destino)) { contador.saltados++; continue; }

    const enlace = $(`a[href*="p=${id}"]`).first();
    const fila = enlace.closest('tr');
    const celdas = fila.find('td').map((_, td) => $(td).text().trim()).get();

    let boxscore = null;
    let resultado = '';
    try {
      boxscore = await scrapePartido(id);
      const ptsL = boxscore.local.reduce((a, j) => a + j.pt, 0);
      const ptsV = boxscore.visitante.reduce((a, j) => a + j.pt, 0);
      if (ptsL + ptsV > 0) resultado = `${ptsL}-${ptsV}`;
    } catch (e) {
      console.log(`    ERROR partido ${id}: ${e.message}`);
    }

    fs.writeFileSync(destino, JSON.stringify({
      id, fase: fase.nombre, jornada: jornadaTexto,
      temporada: TEMPORADA, celdas, resultado, boxscore
    }, null, 1));
    contador.descargados++;
    await pausa(CFG.PAUSA_MS);
  }
}

async function main() {
  const urlBase = `${CFG.BASE}/resultados.aspx?g=${CFG.COMPETICION.id}&t=${TEMPORADA}`;
  const $inicial = await getConEstado(urlBase);

  const fases = [];
  $inicial('select[id*="gruposDropDownList"] option').each((i, o) => {
    const nombre = $inicial(o).text().trim();
    if (!/liga regular/i.test(nombre)) {
      fases.push({ valor: $inicial(o).attr('value'), nombre });
    }
  });

  console.log(`Temporada ${TEMPORADA} — fases encontradas: ${fases.length}`);
  const contador = { total: 0, descargados: 0, saltados: 0 };

  for (const fase of fases) {
    const dirFase = path.join('data', 'raw', TEMPORADA, '_fases', slug(fase.nombre));
    fs.mkdirSync(dirFase, { recursive: true });

    // Seleccionar la fase partiendo SIEMPRE de una carga fresca de la página
    let $ = await getConEstado(urlBase);
    const selectName = $('select[id*="gruposDropDownList"]').attr('name');
    const estado = extraerEstado($);
    $ = await getConEstado(urlBase, {
      ...estado, __EVENTTARGET: selectName, [selectName]: fase.valor
    });

    // 1) Partidos visibles nada más seleccionar la fase (vista por defecto)
    const jornadaVisible = $('select[id*="jornadasDropDownList"] option:selected').text().trim()
      || $('select[id*="jornadasDropDownList"] option').first().text().trim()
      || '';
    await guardarPartidosDeVista($, fase, dirFase, jornadaVisible, contador);

    // 2) Si hay más jornadas en el desplegable, recorrerlas
    //    (re-seleccionando fase + jornada desde página fresca para no perder contexto)
    const jornadas = $('select[id*="jornadasDropDownList"] option')
      .map((_, o) => ({ valor: $(o).attr('value'), nombre: $(o).text().trim() })).get();

    for (const jor of jornadas) {
      if (jor.nombre === jornadaVisible) continue; // ya capturada
      let $j = await getConEstado(urlBase);
      const selName = $j('select[id*="gruposDropDownList"]').attr('name');
      const est1 = extraerEstado($j);
      $j = await getConEstado(urlBase, { ...est1, __EVENTTARGET: selName, [selName]: fase.valor });
      const jorName = $j('select[id*="jornadasDropDownList"]').attr('name');
      if (!jorName) break;
      const est2 = extraerEstado($j);
      $j = await getConEstado(urlBase, {
        ...est2, __EVENTTARGET: jorName,
        [selName]: fase.valor,       // mantener la fase seleccionada en el postback
        [jorName]: jor.valor
      });
      await guardarPartidosDeVista($j, fase, dirFase, jor.nombre, contador);
    }

    console.log(`  ✔ ${fase.nombre}`);
  }

  console.log(`\nPartidos de fases: ${contador.total} | Descargados: ${contador.descargados} | Ya existían: ${contador.saltados}`);
}

main().catch(e => console.error('Error general:', e.message));
