// Scraper FEB: descubre grupos -> jornadas -> partidos -> boxscores
// Uso:
//   node scraper/scrape.js                                     (Tercera, temporada 2025)
//   node scraper/scrape.js --competicion 2                     (Segunda FEB)
//   node scraper/scrape.js --competicion 1 --max-jornadas 1    (Primera, prueba rápida)
//   node scraper/scrape.js --grupo E-A                         (solo un grupo)
//   node scraper/scrape.js --temporada 2024                    (otra temporada)
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const pausa = ms => new Promise(r => setTimeout(r, ms));

function extraerForm($) {
  const form = {};
  $('input[type="hidden"]').each((i, el) => {
    form[$(el).attr('name')] = $(el).attr('value') || '';
  });
  return form;
}

function crearSesion(temporada, competicion) {
  const url = `${CFG.BASE}/resultados.aspx?g=${competicion}&t=${temporada}`;
  return { url, cookies: '' };
}

async function cargarInicial(sesion) {
  const res = await axios.get(sesion.url, { headers: CFG.HEADERS });
  sesion.cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  return cheerio.load(res.data);
}

async function postback(sesion, form, target) {
  form['__EVENTTARGET'] = target;
  form['__EVENTARGUMENT'] = '';
  const res = await axios.post(sesion.url, new URLSearchParams(form).toString(), {
    headers: {
      ...CFG.HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sesion.cookies,
      'Referer': sesion.url
    }
  });
  return cheerio.load(res.data);
}

function parsearTiros(txt) {
  const m = (txt || '').match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { a: +m[1], i: +m[2] } : { a: 0, i: 0 };
}

function parsearMinutos(txt) {
  const m = (txt || '').match(/(\d+):(\d+)/);
  return m ? (+m[1] * 60 + +m[2]) : 0;
}

function parsearBoxscore($, tabla) {
  const jugadores = [];
  if (!tabla) return jugadores;
  $(tabla).find('tr').each((i, tr) => {
    const c = [];
    $(tr).find('td, th').each((j, td) => c.push($(td).text().trim()));
    if (c.length < 20 || !c[2] || /jugador/i.test(c[2])) return;
    if (/total|equipo/i.test(c[2]) && !c[1]) return;
    const enlace = $(tr).find('a[href*="Jugador.aspx"]').attr('href') || '';
    const idJugador = (enlace.match(/[?&]c=(\d+)/) || [])[1] || null;
    jugadores.push({
      idJugador,
      titular: c[0] === '*',
      dorsal: c[1],
      nombre: c[2],
      seg: parsearMinutos(c[3]),
      pt: +c[4] || 0,
      t2: parsearTiros(c[5]),
      t3: parsearTiros(c[6]),
      tc: parsearTiros(c[7]),
      tl: parsearTiros(c[8]),
      ro: +c[9] || 0,
      rd: +c[10] || 0,
      rt: +c[11] || 0,
      as: +c[12] || 0,
      br: +c[13] || 0,
      bp: +c[14] || 0,
      tf: +c[15] || 0,
      tco: +c[16] || 0,
      mt: +c[17] || 0,
      fc: +c[18] || 0,
      fr: +c[19] || 0,
      va: +c[20] || 0,
      pm: parseInt(c[21], 10) || 0
    });
  });
  return jugadores;
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

function parsearJornada($) {
  const partidos = [];
  let equipos = [];
  $('a').each((i, a) => {
    const href = $(a).attr('href') || '';
    if (href.includes('Equipo.aspx')) {
      equipos.push({
        id: (href.match(/i=(\d+)/) || [])[1],
        nombre: $(a).text().trim()
      });
    } else if (href.includes('Partido.aspx')) {
      const idPartido = (href.match(/p=(\d+)/) || [])[1];
      if (equipos.length >= 2 && idPartido) {
        partidos.push({
          id: idPartido,
          local: equipos[equipos.length - 2],
          visitante: equipos[equipos.length - 1],
          resultado: $(a).text().trim()
        });
      }
      equipos = [];
    }
  });
  return partidos;
}

function nombreCortoGrupo(nombreCompleto) {
  const m = nombreCompleto.match(/"([^"]+)"/);
  if (m) return m[1];
  // Sin comillas (p.ej. "Liga Regular Único" de Primera FEB): limpiar y normalizar acentos
  const limpio = nombreCompleto
    .replace(/liga regular/i, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes: Único -> Unico
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '');
  return limpio || 'UNICO';
}

async function seleccionarTemporada(sesion, temporada) {
  let $ = await cargarInicial(sesion);
  const form = extraerForm($);
  form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = temporada;
  $ = await postback(sesion, form, '_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList');
  await pausa(CFG.PAUSA_MS);
  return $;
}

function descubrirGrupos($) {
  const grupos = [];
  $('#_ctl0_MainContentPlaceHolderMaster_gruposDropDownList option').each((i, opt) => {
    const nombre = $(opt).text().trim();
    if (CFG.FILTRO_GRUPOS.test(nombre)) {
      grupos.push({ id: $(opt).attr('value'), nombre, corto: nombreCortoGrupo(nombre) });
    }
  });
  return grupos;
}

async function scrapeGrupo(sesion, $, competicionNombre, temporada, grupo, maxJornadas) {
  console.log(`\n========== ${competicionNombre} | GRUPO ${grupo.corto} (${grupo.id}) | temporada ${temporada} ==========`);
  const dirGrupo = path.join('data', 'raw', competicionNombre, temporada, grupo.corto);
  fs.mkdirSync(dirGrupo, { recursive: true });

  let form = extraerForm($);
  form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = temporada;
  form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = grupo.id;
  $ = await postback(sesion, form, '_ctl0:MainContentPlaceHolderMaster:gruposDropDownList');
  await pausa(CFG.PAUSA_MS);

  const jornadas = [];
  $('#_ctl0_MainContentPlaceHolderMaster_jornadasDropDownList option').each((i, opt) => {
    jornadas.push({ id: $(opt).attr('value'), nombre: $(opt).text().trim() });
  });
  console.log(`Jornadas encontradas: ${jornadas.length}`);
  const aProcesar = maxJornadas ? jornadas.slice(0, maxJornadas) : jornadas;

  const indice = [];
  for (const jornada of aProcesar) {
    form = extraerForm($);
    form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = temporada;
    form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = grupo.id;
    form['_ctl0:MainContentPlaceHolderMaster:jornadasDropDownList'] = jornada.id;
    $ = await postback(sesion, form, '_ctl0:MainContentPlaceHolderMaster:jornadasDropDownList');
    await pausa(CFG.PAUSA_MS);

    const partidos = parsearJornada($);
    console.log(`${jornada.nombre}: ${partidos.length} partidos`);

    for (const p of partidos) {
      const fichero = path.join(dirGrupo, `${p.id}.json`);
      indice.push({ jornada: jornada.nombre, ...p });

      if (fs.existsSync(fichero)) {
        console.log(`   ${p.id} ya descargado, saltando`);
        continue;
      }
      if (!/\d+\s*-\s*\d+/.test(p.resultado)) {
        console.log(`   ${p.id} sin resultado (no jugado aún), saltando`);
        continue;
      }
      try {
        const box = await scrapePartido(p.id);
        const disputado = box.local.length > 0 && box.visitante.length > 0;
        const datos = {
          id: p.id,
          temporada,
          competicion: competicionNombre,
          grupo: grupo.corto,
          jornada: jornada.nombre,
          equipoLocal: p.local,
          equipoVisitante: p.visitante,
          resultado: p.resultado,
          disputado,
          descargado: new Date().toISOString(),
          boxscore: box
        };
        fs.writeFileSync(fichero, JSON.stringify(datos, null, 1));
        const nota = disputado ? '' : '  [NO DISPUTADO - sanción/incomparecencia]';
        console.log(`   ${p.id} OK: ${p.local.nombre} vs ${p.visitante.nombre} (${p.resultado}) | jugadores: ${box.local.length}+${box.visitante.length}${nota}`);
      } catch (e) {
        console.log(`   ${p.id} ERROR: ${e.message}`);
      }
      await pausa(CFG.PAUSA_MS);
    }
  }

  fs.writeFileSync(path.join(dirGrupo, '_indice.json'), JSON.stringify(indice, null, 1));
  console.log(`Índice del grupo ${grupo.corto} guardado (${indice.length} partidos).`);
}

async function main() {
  const args = process.argv.slice(2);
  const leerArg = flag => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const temporada = leerArg('--temporada') || CFG.TEMPORADA_DEFECTO;
  const competicion = leerArg('--competicion') || String(CFG.COMPETICION.id);
  const competicionNombre = CFG.COMPETICIONES[competicion];
  if (!competicionNombre) {
    console.error(`Competición '${competicion}' desconocida. Válidas: ${Object.keys(CFG.COMPETICIONES).join(', ')}`);
    process.exit(1);
  }
  const grupoElegido = leerArg('--grupo');
  const maxJornadas = leerArg('--max-jornadas') ? parseInt(leerArg('--max-jornadas'), 10) : null;

  console.log(`Competición: ${competicionNombre} (g=${competicion}) | Temporada: ${temporada}`);
  const sesion = crearSesion(temporada, competicion);
  const $ = await seleccionarTemporada(sesion, temporada);

  let grupos = descubrirGrupos($);
  if (!grupos.length) {
    console.error('No se encontraron grupos de liga regular para esa temporada/competición.');
    process.exit(1);
  }
  console.log(`Grupos descubiertos: ${grupos.map(g => g.corto).join(', ')}`);

  if (grupoElegido) {
    grupos = grupos.filter(g => g.corto === grupoElegido);
    if (!grupos.length) {
      console.error(`Grupo ${grupoElegido} no encontrado.`);
      process.exit(1);
    }
  }

  for (const grupo of grupos) {
    const s = crearSesion(temporada, competicion);
    const $g = await seleccionarTemporada(s, temporada);
    await scrapeGrupo(s, $g, competicionNombre, temporada, grupo, maxJornadas);
  }
  console.log('\nScraping completado.');
}

main().catch(err => console.error('Error general:', err.message));
