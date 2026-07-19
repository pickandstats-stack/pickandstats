// Diagnóstico: qué ve el scraper en una fase concreta.
// Uso: node scraper/diagnostico-fase.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const CFG = require('./config');

const TEMPORADA = '2025';
const NOMBRE_FASE = /ELIMIN. GR "A" 1\/4/i;

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

async function main() {
  const url = `${CFG.BASE}/resultados.aspx?g=${CFG.COMPETICION.id}&t=${TEMPORADA}`;
  let $ = await getConEstado(url);

  const opciones = $('select[id*="gruposDropDownList"] option')
    .map((_, o) => ({ valor: $(o).attr('value'), nombre: $(o).text().trim() })).get();
  const fase = opciones.find(o => NOMBRE_FASE.test(o.nombre));
  if (!fase) { console.log('Fase no encontrada'); return; }
  console.log(`Fase: ${fase.nombre} [${fase.valor}]`);

  const selectName = $('select[id*="gruposDropDownList"]').attr('name');
  const estado = extraerEstado($);
  $ = await getConEstado(url, { ...estado, __EVENTTARGET: selectName, [selectName]: fase.valor });

  // ¿qué hay tras seleccionar la fase?
  const selJor = $('select[id*="jornadasDropDownList"]');
  const jornadas = selJor.find('option').map((_, o) => $(o).text().trim()).get();
  console.log(`\nDesplegable de jornadas: ${jornadas.length ? jornadas.join(' | ') : 'VACÍO o inexistente'}`);

  const enlaces = $('a[href*="Partido.aspx"]').map((_, a) => $(a).attr('href')).get();
  console.log(`Enlaces a Partido.aspx en la vista inicial de la fase: ${enlaces.length}`);
  enlaces.slice(0, 6).forEach(h => console.log(`  ${h}`));

  // volcado de las filas de tabla para ver el formato
  console.log('\nPrimeras filas de tabla:');
  $('tr').slice(0, 12).each((i, tr) => {
    const celdas = $(tr).find('td').map((_, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
    if (celdas.length) console.log(`  [${celdas.join(' || ')}]`);
  });

  fs.writeFileSync('/tmp/fase_debug.html', $.html());
  console.log('\nHTML completo guardado en /tmp/fase_debug.html');
}

main().catch(e => console.error('Error:', e.message));
