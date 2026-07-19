// Diagnóstico específico: jornadas y partidos de FASE FINAL-A FFA1
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

const TEMPORADA = '2025';

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
  const fase = $('select[id*="gruposDropDownList"] option')
    .map((_, o) => ({ valor: $(o).attr('value'), nombre: $(o).text().trim() })).get()
    .find(o => /FASE FINAL-A FFA1/i.test(o.nombre));
  console.log(`Fase: ${fase.nombre} [${fase.valor}]`);

  const selName = $('select[id*="gruposDropDownList"]').attr('name');
  const est = extraerEstado($);
  $ = await getConEstado(url, { ...est, __EVENTTARGET: selName, [selName]: fase.valor });

  const selJor = $('select[id*="jornadasDropDownList"]');
  const jornadas = selJor.find('option').map((_, o) => ({
    valor: $(o).attr('value'), nombre: $(o).text().trim(),
    seleccionada: $(o).attr('selected') !== undefined
  })).get();
  console.log('\nJornadas en el desplegable:');
  jornadas.forEach(j => console.log(`  [${j.valor}] ${j.nombre}${j.seleccionada ? '  <-- seleccionada' : ''}`));

  const listar = ($$) => {
    const ids = [...new Set($$('a[href*="Partido.aspx?p="]').map((_, a) =>
      ($$(a).attr('href').match(/p=(\d+)/) || [])[1]).get())];
    console.log(`  partidos visibles: ${ids.join(', ') || 'ninguno'}`);
  };

  console.log('\nVista inicial de la fase:');
  listar($);

  for (const jor of jornadas) {
    let $j = await getConEstado(url);
    const sn = $j('select[id*="gruposDropDownList"]').attr('name');
    const e1 = extraerEstado($j);
    $j = await getConEstado(url, { ...e1, __EVENTTARGET: sn, [sn]: fase.valor });
    const jn = $j('select[id*="jornadasDropDownList"]').attr('name');
    const e2 = extraerEstado($j);
    $j = await getConEstado(url, {
      ...e2, __EVENTTARGET: jn, [sn]: fase.valor, [jn]: jor.valor
    });
    console.log(`\nTras seleccionar "${jor.nombre}":`);
    listar($j);
  }
}
main().catch(e => console.error('Error:', e.message));
