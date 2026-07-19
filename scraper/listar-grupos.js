// Lista TODOS los grupos del desplegable de una temporada, sin filtrar.
// Uso: node scraper/listar-grupos.js [--temporada 2025]
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

const args = process.argv.slice(2);
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? args[iT + 1] : '2025';

async function main() {
  const url = `${CFG.BASE}/resultados.aspx?g=${CFG.COMPETICION.id}&t=${TEMPORADA}`;
  const res = await axios.get(url, { headers: CFG.HEADERS });
  const $ = cheerio.load(res.data);
  console.log(`Temporada ${TEMPORADA} — grupos en el desplegable:\n`);
  $('select[id*="gruposDropDownList"] option').each((i, o) => {
    console.log(`  [${$(o).attr('value')}] ${$(o).text().trim()}`);
  });
}
main().catch(e => console.error('Error:', e.message));
