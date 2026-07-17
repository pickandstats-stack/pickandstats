// Añade el marcador por cuartos a los partidos ya guardados, sin re-descargar boxscores.
// Uso: node scraper/anadir-cuartos.js [--temporada 2025]
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const args = process.argv.slice(2);
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? args[iT + 1] : '2025';
const DIR = path.join('data', 'raw', TEMPORADA);
const pausa = ms => new Promise(r => setTimeout(r, ms));

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

async function main() {
  let total = 0, actualizados = 0, saltados = 0, sinDatos = 0, errores = 0;

  const grupos = fs.readdirSync(DIR).filter(g =>
    fs.statSync(path.join(DIR, g)).isDirectory());

  for (const grupo of grupos) {
    const dirGrupo = path.join(DIR, grupo);
    const ficheros = fs.readdirSync(dirGrupo)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'));

    console.log(`\n== Grupo ${grupo}: ${ficheros.length} partidos ==`);

    for (const f of ficheros) {
      total++;
      const ruta = path.join(dirGrupo, f);
      const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));

      // saltar si ya tiene cuartos o si no se disputó
      if (datos.boxscore && Array.isArray(datos.boxscore.cuartos) && datos.boxscore.cuartos.length) {
        saltados++; continue;
      }
      if (!datos.boxscore || !datos.boxscore.local || !datos.boxscore.local.length) {
        sinDatos++; continue;
      }

      try {
        const res = await axios.get(`${CFG.BASE}/Partido.aspx?p=${datos.id}`, { headers: CFG.HEADERS });
        const $ = cheerio.load(res.data);
        const cuartos = parsearCuartos($);
        datos.boxscore.cuartos = cuartos;
        fs.writeFileSync(ruta, JSON.stringify(datos, null, 1));
        actualizados++;
        if (actualizados % 25 === 0) console.log(`   ...${actualizados} actualizados`);
      } catch (e) {
        errores++;
        console.log(`   ERROR en ${datos.id}: ${e.message}`);
      }
      await pausa(CFG.PAUSA_MS);
    }
  }

  console.log(`\n=== Resumen temporada ${TEMPORADA} ===`);
  console.log(`Total: ${total} | Actualizados: ${actualizados} | Ya tenían: ${saltados} | Sin boxscore: ${sinDatos} | Errores: ${errores}`);
}

main().catch(err => console.error('Error general:', err.message));
