import { useMemo } from 'react';

const confDeFinal = f => (f.match(/1º([A-E])A/) || [])[1] || '?';
const confDeElim = f => (f.match(/GR "([A-E])"/) || [])[1] || '?';

export default function FasesAscenso({ fases, onVerEquipoNombre, onVerPartido }) {
  const estructura = useMemo(() => {
    const finales = [], cuartos = {}, semis = {}, liguillas = [], cruces = [];
    for (const f of fases) {
      if (/^1º/.test(f.fase)) finales.push({ ...f, conf: confDeFinal(f.fase) });
      else if (/1\/4/.test(f.fase)) cuartos[confDeElim(f.fase)] = f;
      else if (/1\/2/.test(f.fase)) semis[confDeElim(f.fase)] = f;
      else if (/^FASE FINAL/.test(f.fase)) liguillas.push(f);
      else if (/^FF 2º/.test(f.fase)) cruces.push(f);
    }
    finales.sort((a, b) => a.conf.localeCompare(b.conf));
    liguillas.sort((a, b) => a.fase.localeCompare(b.fase));

    // global de cada final (ida + vuelta)
    const finalesConGlobal = finales.map(f => {
      const puntos = {};
      for (const p of f.partidos) {
        if (!p.resultado) continue;
        const [gl, gv] = p.resultado.split('-').map(Number);
        puntos[p.local] = (puntos[p.local] || 0) + gl;
        puntos[p.visitante] = (puntos[p.visitante] || 0) + gv;
      }
      const equipos = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
      return { ...f, global: equipos, campeon: equipos[0]?.[0] || null };
    });

    // mini-clasificación de cada liguilla
    const liguillasConTabla = liguillas.map(f => {
      const tab = {};
      for (const p of f.partidos) {
        if (!p.resultado) continue;
        const [gl, gv] = p.resultado.split('-').map(Number);
        for (const eq of [p.local, p.visitante])
          if (!tab[eq]) tab[eq] = { nombre: eq, pj: 0, pg: 0, dif: 0, pf: 0 };
        tab[p.local].pj++; tab[p.visitante].pj++;
        tab[p.local].pf += gl; tab[p.visitante].pf += gv;
        tab[p.local].dif += gl - gv; tab[p.visitante].dif += gv - gl;
        if (gl > gv) tab[p.local].pg++; else tab[p.visitante].pg++;
      }
      const clasif = Object.values(tab).sort((a, b) => b.pg - a.pg || b.dif - a.dif || b.pf - a.pf);
      return { ...f, clasif };
    });
// Ascendidos: campeón de cada liguilla + ganador de cada cruce de segundos
    const ascendidos = [];
    for (const f of liguillasConTabla) {
      if (f.clasif.length && f.clasif[0].pj >= 3) {
        ascendidos.push({ nombre: f.clasif[0].nombre, via: `Campeón ${f.fase.replace('FASE FINAL-', '')}` });
      }
    }
    for (const f of cruces) {
      const p = f.partidos[0];
      if (p && p.disputado && p.resultado) {
        const [gl, gv] = p.resultado.split('-').map(Number);
        ascendidos.push({
          nombre: gl > gv ? p.local : p.visitante,
          via: `Cruce de segundos · sede ${f.fase.startsWith('FF 2ºA') ? 'A' : 'B'}`
        });
      }
    }
    return { finales: finalesConGlobal, cuartos, semis, liguillas: liguillasConTabla, cruces, ascendidos };
  }, [fases]);

  const nombreClicable = n => (
    <span className="enlace" onClick={e => { e.stopPropagation(); onVerEquipoNombre(n); }}>{n}</span>
  );

  const cardPartido = p => {
    const jugado = p.disputado && p.resultado;
    const [gl, gv] = jugado ? p.resultado.split('-').map(Number) : [null, null];
    return (
      <div className={`resultado-card ${jugado ? 'enlace-card' : ''}`} key={p.id}
        onClick={() => jugado && onVerPartido(p.id)}>
        <div className="resultado-grupo">{p.fecha}</div>
        <div className={`resultado-linea ${jugado && gl > gv ? 'gana' : ''}`}>
          <span>{nombreClicable(p.local)}</span>
          <span className="resultado-marca">{jugado ? gl : '-'}</span>
        </div>
        <div className={`resultado-linea ${jugado && gv > gl ? 'gana' : ''}`}>
          <span>{nombreClicable(p.visitante)}</span>
          <span className="resultado-marca">{jugado ? gv : '-'}</span>
        </div>
      </div>
    );
  };

  const CONFS = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="fases-estructura">
{estructura.ascendidos.length > 0 && (
        <>
          <h3 className="seccion">Ascendidos a Segunda FEB</h3>
          <div className="ascendidos-panel">
            {estructura.ascendidos.map(a => (
              <div className="ascendido-card" key={a.nombre}>
                <div className="ascendido-nombre">{nombreClicable(a.nombre)}</div>
                <div className="ascendido-via">{a.via}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <h3 className="seccion">El camino de los campeones · Finales de conferencia (ida y vuelta)</h3>
      <div className="fases-grid">
        {estructura.finales.map(f => (
          <div className="analisis-bloque" key={f.fase}>
            <div className="analisis-titulo">Conferencia {f.conf}</div>
            <div className="resultados-jornada">{f.partidos.map(cardPartido)}</div>
            {f.campeon && f.global.length === 2 && (
              <p className="fase-veredicto">
                🏆 <strong>{f.campeon}</strong> campeón de conferencia
                (global {f.global[0][1]}-{f.global[1][1]})
              </p>
            )}
          </div>
        ))}
      </div>

      <h3 className="seccion">El camino de las eliminatorias · a partido único</h3>
      <div className="fases-grid">
        {CONFS.map(c => (
          (estructura.cuartos[c] || estructura.semis[c]) && (
            <div className="analisis-bloque" key={c}>
              <div className="analisis-titulo">Conferencia {c}</div>
              {estructura.cuartos[c] && (
                <>
                  <div className="fase-ronda">Cuartos de final</div>
                  <div className="resultados-jornada">{estructura.cuartos[c].partidos.map(cardPartido)}</div>
                </>
              )}
              {estructura.semis[c] && (
                <>
                  <div className="fase-ronda">Semifinales</div>
                  <div className="resultados-jornada">{estructura.semis[c].partidos.map(cardPartido)}</div>
                </>
              )}
            </div>
          )
        ))}
      </div>

      <h3 className="seccion">Fases Finales · liguillas por el ascenso (28-30 mayo)</h3>
      <div className="fases-grid">
        {estructura.liguillas.map(f => (
          <div className="analisis-bloque" key={f.fase}>
            <div className="analisis-titulo">{f.fase.replace('FASE FINAL-', 'Sede ')}</div>
            <table className="tabla-duelo">
              <tbody>
                {f.clasif.map((e, i) => (
                  <tr key={e.nombre}>
                    <td className="duelo-faceta">
                      {i + 1}. {nombreClicable(e.nombre)}
                      {i === 0 && <span className="badge-ascenso">ASCENSO</span>}
                    </td>
                    <td className="duelo-veredicto">
                      {e.pg}-{e.pj - e.pg} · {e.dif > 0 ? '+' : ''}{e.dif}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details className="fase-detalles">
              <summary>Ver los {f.partidos.length} partidos</summary>
              <div className="resultados-jornada" style={{ marginTop: 8 }}>
                {f.partidos.map(cardPartido)}
              </div>
            </details>
          </div>
        ))}
      </div>

      <h3 className="seccion">Cruces de segundos · última plaza de cada sede (31 mayo)</h3>
      <div className="fases-grid">
        {estructura.cruces.map(f => {
          const p = f.partidos[0];
          const jugado = p && p.disputado && p.resultado;
          const [gl, gv] = jugado ? p.resultado.split('-').map(Number) : [null, null];
          const ganador = jugado ? (gl > gv ? p.local : p.visitante) : null;
          return (
            <div className="analisis-bloque" key={f.fase}>
              <div className="analisis-titulo">{f.fase.startsWith('FF 2ºA') ? 'Sede A' : 'Sede B'}</div>
              <div className="resultados-jornada">{f.partidos.map(cardPartido)}</div>
              {ganador && (
                <p className="fase-veredicto">
                  <strong>{ganador}</strong> <span className="badge-ascenso">ASCENSO</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="pie" style={{ marginTop: 8 }}>
        Ascienden a Segunda FEB los campeones de cada liguilla de las Fases Finales y los
        ganadores de los cruces de segundos. Clasificaciones de liguilla calculadas por
        victorias y diferencia; el criterio oficial de la FEB puede diferir en empates.
      </p>
    </div>
  );
}
