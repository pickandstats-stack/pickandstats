import { useMemo } from 'react';

// Compara valor con la media y devuelve nivel -2..+2 según desviación relativa.
// umbralPct define qué % de desviación cuenta como "algo" (1) o "mucho" (2).
function nivel(valor, media, { menosEsMejor = false, u1 = 0.06, u2 = 0.15 } = {}) {
  if (media === 0) return 0;
  let d = (valor - media) / Math.abs(media);
  if (menosEsMejor) d = -d;
  if (d >= u2) return 2;
  if (d >= u1) return 1;
  if (d <= -u2) return -2;
  if (d <= -u1) return -1;
  return 0;
}

export default function AnalisisEquipo({ equipo, equipos }) {
  const analisis = useMemo(() => {
    const delGrupo = equipos.filter(e => e.grupo === equipo.grupo);
    const media = clave => delGrupo.reduce((a, e) => a + e[clave], 0) / delGrupo.length;

    const m = {
      pace: media('pace'),
      ortg: media('ortg'), drtg: media('drtg'),
      efg: media('efg'), tovPct: media('tovPct'), orbPct: media('orbPct'), ftRate: media('ftRate'),
      efgRival: media('efgRival'), tovForzadas: media('tovForzadas'),
      drbPct: media('drbPct'), ftrRival: media('ftrRival'),
      t3ar: media('t3ar'), astPct: media('astPct'),
    };

    // --- Identidad de juego ---
    const identidad = [];
    const nPace = nivel(equipo.pace, m.pace);
    if (nPace >= 1) identidad.push('Equipo de ritmo alto: busca correr y jugar muchas posesiones.');
    else if (nPace <= -1) identidad.push('Equipo de ritmo pausado: controla el tempo y juega a medio campo.');
    else identidad.push('Ritmo de juego en la media del grupo.');

    // Distribución de anotación
    if (equipo.pct3 >= 40) identidad.push('Gran dependencia del tiro exterior: vive del triple.');
    else if (equipo.pct3 <= 25) identidad.push('Equipo de juego interior: la mayoría de sus puntos llegan cerca del aro.');
    else identidad.push('Reparto equilibrado entre juego interior y exterior.');

    const nAst = nivel(equipo.astPct, m.astPct);
    if (nAst >= 1) identidad.push('Juego muy coral: comparte mucho el balón, alto porcentaje de canastas asistidas.');
    else if (nAst <= -1) identidad.push('Ataque más individual: menos canastas asistidas de lo habitual.');

    // --- Ataque (Four Factors ofensivos) ---
    const ataque = [];
    const evalua = (nv, alto, bajo) => { if (nv >= 1) ataque.push(alto); else if (nv <= -1) ataque.push(bajo); };
    evalua(nivel(equipo.efg, m.efg),
      'Muy buen acierto de tiro (eFG% sobre la media): equipo eficiente anotando.',
      'Acierto de tiro por debajo de la media: le cuesta anotar con eficiencia.');
    evalua(nivel(equipo.tovPct, m.tovPct, { menosEsMejor: true }),
      'Cuida bien el balón: pierde pocos balones.',
      'Pierde muchos balones: tiende a regalar posesiones.');
    evalua(nivel(equipo.orbPct, m.orbPct),
      'Domina el rebote ofensivo: genera segundas oportunidades.',
      'Poco rebote ofensivo: apenas insiste tras fallo.');
    evalua(nivel(equipo.ftRate, m.ftRate),
      'Pisa mucho la línea de tiros libres: genera faltas.',
      'Genera pocos tiros libres.');

    const nOrtg = nivel(equipo.ortg, m.ortg);
    const resumenAtaque = nOrtg >= 2 ? 'Ataque dominante en el grupo.'
      : nOrtg >= 1 ? 'Ataque por encima de la media.'
      : nOrtg <= -2 ? 'Ataque flojo respecto al grupo.'
      : nOrtg <= -1 ? 'Ataque por debajo de la media.'
      : 'Ataque en la media del grupo.';

    // --- Defensa (Four Factors defensivos) ---
    const defensa = [];
    const evaluaD = (nv, alto, bajo) => { if (nv >= 1) defensa.push(alto); else if (nv <= -1) defensa.push(bajo); };
    evaluaD(nivel(equipo.efgRival, m.efgRival, { menosEsMejor: true }),
      'Defiende muy bien el tiro rival: fuerza malos porcentajes.',
      'Permite buen acierto al rival: le cuesta defender el tiro.');
    evaluaD(nivel(equipo.tovForzadas, m.tovForzadas),
      'Defensa agresiva: fuerza muchas pérdidas al rival.',
      'Defensa poco agresiva: fuerza pocas pérdidas.');
    evaluaD(nivel(equipo.drbPct, m.drbPct),
      'Controla su rebote defensivo: cierra bien tras fallo.',
      'Sufre en el rebote defensivo: concede segundas oportunidades.');
    evaluaD(nivel(equipo.ftrRival, m.ftrRival, { menosEsMejor: true }),
      'Defiende sin cometer faltas en exceso.',
      'Comete muchas faltas: manda al rival a la línea.');

    const nDrtg = nivel(equipo.drtg, m.drtg, { menosEsMejor: true });
    const resumenDefensa = nDrtg >= 2 ? 'Defensa dominante en el grupo.'
      : nDrtg >= 1 ? 'Defensa por encima de la media.'
      : nDrtg <= -2 ? 'Defensa floja respecto al grupo.'
      : nDrtg <= -1 ? 'Defensa por debajo de la media.'
      : 'Defensa en la media del grupo.';

    // --- Claves para enfrentarlo (a partir de sus debilidades) ---
    const claves = [];
    if (nivel(equipo.efgRival, m.efgRival, { menosEsMejor: true }) <= -1)
      claves.push('Su defensa del tiro es floja: buscar tiros abiertos, especialmente exteriores.');
    if (nivel(equipo.drbPct, m.drbPct) <= -1)
      claves.push('Sufre en el rebote defensivo: insistir en el rebote de ataque tras fallo.');
    if (nivel(equipo.tovForzadas, m.tovForzadas) <= -1)
      claves.push('Presiona poco: se le puede jugar con calma, sin agobios en la salida de balón.');
    if (nivel(equipo.ftrRival, m.ftrRival, { menosEsMejor: true }) <= -1)
      claves.push('Comete muchas faltas: atacar el aro para generar tiros libres y cargarles de personales.');
    if (nivel(equipo.tovPct, m.tovPct, { menosEsMejor: true }) <= -1)
      claves.push('Pierde balones con facilidad: subir la presión defensiva para forzar más pérdidas.');
    if (nivel(equipo.orbPct, m.orbPct) >= 1)
      claves.push('Es peligroso al rebote ofensivo: hacer bloqueo de rebote disciplinado para no conceder segundas.');
    if (equipo.pct3 >= 40)
      claves.push('Depende mucho del triple: presionar la línea de tres puede secar su ataque.');
    if (claves.length === 0)
      claves.push('Equipo sin debilidades marcadas respecto a su grupo: exigirá un partido muy completo.');

    // --- Fortalezas y debilidades (lista de métricas destacadas) ---
    const fortalezas = [];
    const debilidades = [];
    const revisa = (etiqueta, nv) => {
      if (nv >= 2) fortalezas.push(etiqueta);
      else if (nv <= -2) debilidades.push(etiqueta);
    };
    revisa('Acierto de tiro (eFG%)', nivel(equipo.efg, m.efg));
    revisa('Cuidado del balón', nivel(equipo.tovPct, m.tovPct, { menosEsMejor: true }));
    revisa('Rebote ofensivo', nivel(equipo.orbPct, m.orbPct));
    revisa('Defensa del tiro rival', nivel(equipo.efgRival, m.efgRival, { menosEsMejor: true }));
    revisa('Robos / presión', nivel(equipo.tovForzadas, m.tovForzadas));
    revisa('Rebote defensivo', nivel(equipo.drbPct, m.drbPct));
    revisa('Juego coral (asistencias)', nivel(equipo.astPct, m.astPct));

    return { identidad, ataque, resumenAtaque, defensa, resumenDefensa, claves, fortalezas, debilidades };
  }, [equipo, equipos]);

  const bloque = (titulo, items, clase = '') => (
    items.length > 0 && (
      <div className={`analisis-bloque ${clase}`}>
        <div className="analisis-titulo">{titulo}</div>
        <ul className="analisis-lista">
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    )
  );

  return (
    <div className="analisis">
      <div className="analisis-resumen">
        <span className="analisis-badge">{analisis.resumenAtaque}</span>
        <span className="analisis-badge">{analisis.resumenDefensa}</span>
      </div>

      <div className="analisis-grid">
        {bloque('Identidad de juego', analisis.identidad)}
        {bloque('En ataque', analisis.ataque)}
        {bloque('En defensa', analisis.defensa)}
        {bloque('Fortalezas', analisis.fortalezas, 'analisis-fort')}
        {bloque('Debilidades', analisis.debilidades, 'analisis-deb')}
        {bloque('Claves para enfrentarlo', analisis.claves, 'analisis-claves')}
      </div>

      <p className="pie" style={{ marginTop: 8 }}>
        Análisis automático a partir de la comparación con la media del grupo {equipo.grupo}.
        Orientativo, basado solo en datos estadísticos.
      </p>
    </div>
  );
}
