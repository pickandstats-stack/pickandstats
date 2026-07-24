// Scraper FEB: descubre grupos -> jornadas -> partidos -> boxscores
// Uso:
//   node scraper/scrape.js                                     (Tercera, temporada 2025)
//   node scraper/scrape.js --competicion 2                     (Segunda FEB)
//   node scraper/scrape.js --competicion 1 --max-jornadas 1    (Primera, prueba rápida)
//   node scraper/scrape.js --grupo E-A                         (solo un grupo)
//   node scraper/scrape.js --temporada 2024                    (otra temporada)
const axios = require('axios');

// Reintentos ante fallos de red transitorios (EADDRNOTAVAIL, ETIMEDOUT, 5xx...).
// Un parpadeo de conexión no debe abortar el scrape de una competición entera.
// Grupos que no han traído ningún partido: si ocurre en plena competición,
// es señal de que la web de la FEB ha cambiado y el scraper ya no encuentra nada.
const _gruposVacios = [];
const _enTemporada = () => { const m = new Date().getMonth() + 1; return m >= 9 || m <= 6; };

const REINTENTOS = 4;
const esTransitorio = e => {
  const cod = e.code || '';
  if (['EADDRNOTAVAIL','ECONNRESET','ETIMEDOUT','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','EPIPE','ECONNABORTED'].includes(cod)) return true;
  const st = e.response && e.response.status;
  return st === 429 || (st >= 500 && st < 600);
};
async function conReintentos(fn, que) {
  let ultimo;
  for (let i = 1; i <= REINTENTOS; i++) {
    try { return await fn(); }
    catch (e) {
      ultimo = e;
      if (!esTransitorio(e) || i === REINTENTOS) break;
      const espera = 2000 * Math.pow(2, i - 1);   // 2s, 4s, 8s
      console.log('  ↻ fallo de red en ' + que + ' (' + (e.code || e.message) + '). Reintento ' + i + '/' + (REINTENTOS-1) + ' en ' + (espera/1000) + 's');
      await new Promise(r => setTimeout(r, espera));
    }
  }
  throw ultimo;
}
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CFG = require('./config');
const { detectar } = require('./temporada-actual');

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
  const res = await conReintentos(() => axios.get(sesion.url, { headers: CFG.HEADERS }), 'carga de sesión');
  sesion.cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  return cheerio.load(res.data);
}

async function postback(sesion, form, target) {
  form['__EVENTTARGET'] = target;
  form['__EVENTARGUMENT'] = '';
  const res = await conReintentos(() => axios.post(sesion.url, new URLSearchParams(form).toString(), {
    headers: {
      ...CFG.HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sesion.cookies,
      'Referer': sesion.url
    }
  }), 'formulario');
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
  const res = await conReintentos(() => axios.get(`${CFG.BASE}/Partido.aspx?p=${idPartido}`, { headers: CFG.HEADERS }), 'partido ' + idPartido);
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
  if (indice.length === 0) {
    _gruposVacios.push(competicionNombre + ' ' + temporada + ' · grupo ' + grupo.corto);
    console.log('  ⚠ El grupo ' + grupo.corto + ' no ha devuelto NINGÚN partido.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const leerArg = flag => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const competicion = leerArg('--competicion') || String(CFG.COMPETICION.id);
  const competicionNombre = CFG.COMPETICIONES[competicion];

  let temporada = leerArg('--temporada');
  if (temporada) {
    console.log('Temporada forzada por parámetro: ' + temporada);
  } else {
    try {
      const det = await detectar(competicion);
      temporada = det.temporada;
      console.log('Temporada detectada en la FEB: ' + temporada + ' (' + det.etiqueta + ')');
      if (det.temporada !== CFG.TEMPORADA_DEFECTO)
        console.log('  ⚠ Cambio de temporada respecto a TEMPORADA_DEFECTO (' + CFG.TEMPORADA_DEFECTO + ')');
      if (det.discrepancia)
        console.log('  ⚠ La FEB ofrece una temporada más reciente sin seleccionar: ' + det.maxima);
    } catch (e) {
      temporada = CFG.TEMPORADA_DEFECTO;
      console.log('  ⚠ No se pudo detectar la temporada (' + e.message + '). Uso ' + temporada);
    }
  }

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
  if (_gruposVacios.length) {
    console.log('\n  ⚠⚠ ' + _gruposVacios.length + ' grupo(s) sin ningún partido:');
    _gruposVacios.forEach(g => console.log('      ' + g));
    if (_enTemporada()) {
      console.log('  En plena competición esto NO es normal: puede que la web de la FEB haya cambiado');
      console.log('  y el scraper ya no encuentre los partidos. Revísalo antes de fiarte de los datos.');
    } else {
      console.log('  (Estamos fuera de temporada, así que puede ser normal.)');
    }
  }

  // Dejar constancia de qué temporada se ha bajado y cuándo.
  // Lo lee el workflow para pasársela a calcular.js, y la app para mostrar
  // la fecha de actualización de los datos.
  try {
    const fEstado = path.join('data', 'processed', 'estado.json');
    let estado = { competiciones: {} };
    if (fs.existsSync(fEstado)) estado = JSON.parse(fs.readFileSync(fEstado, 'utf8'));
    estado.competiciones = estado.competiciones || {};
    estado.competiciones[competicionNombre] = {
      temporada,
      actualizado: new Date().toISOString()
    };
    estado.actualizado = new Date().toISOString();
    fs.mkdirSync(path.dirname(fEstado), { recursive: true });
    fs.writeFileSync(fEstado, JSON.stringify(estado, null, 1));
    console.log('Estado guardado en ' + fEstado);
  } catch (e) {
    console.log('  ⚠ No se pudo guardar el estado: ' + e.message);
  }

  console.log('\nScraping completado.');
}

main().catch(err => console.error('Error general:', err.message));
