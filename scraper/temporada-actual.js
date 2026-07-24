// Detecta la temporada vigente leyendo el desplegable de la web de la FEB.
// Evita tener que editar TEMPORADA_DEFECTO a mano cada septiembre.
// Uso como módulo:  const { detectar } = require('./temporada-actual');
// Uso directo:      node scraper/temporada-actual.js
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

async function detectar(competicion = 3) {
  const url = `${CFG.BASE}/resultados.aspx?g=${competicion}&t=${CFG.TEMPORADA_DEFECTO}`;
  const res = await axios.get(url, { headers: CFG.HEADERS });
  const $ = cheerio.load(res.data);
  const opts = $('select[id*="temporadasDropDownList"] option')
    .map((i, o) => ({ valor: $(o).attr('value'), texto: $(o).text().trim(), sel: $(o).attr('selected') != null }))
    .get()
    .filter(o => /^\d{4}$/.test(o.valor));

  if (!opts.length) throw new Error('No se encontró el desplegable de temporadas');

  const seleccionada = opts.find(o => o.sel);
  const maxima = opts.map(o => +o.valor).sort((a, b) => b - a)[0];
  const elegida = seleccionada ? +seleccionada.valor : maxima;

  return {
    temporada: String(elegida),
    etiqueta: (seleccionada || opts.find(o => +o.valor === elegida)).texto,
    maxima: String(maxima),
    discrepancia: elegida !== maxima
  };
}

module.exports = { detectar };

if (require.main === module) {
  (async () => {
    for (const g of Object.keys(CFG.COMPETICIONES)) {
      const r = await detectar(g);
      console.log(CFG.COMPETICIONES[g].padEnd(12) + r.temporada + '  (' + r.etiqueta + ')' +
        (r.discrepancia ? '   ⚠ existe una más reciente: ' + r.maxima : ''));
    }
  })().catch(e => { console.error('Error:', e.message); process.exit(1); });
}
