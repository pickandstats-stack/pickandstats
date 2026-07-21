import { useEffect, useMemo, useState } from 'react';
import FasesAscenso from './FasesAscenso';
import PlayOff from './PlayOff';

const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);
const etiquetaJornada = j => (String(j).match(/Jornada\s*\d+\s*\([^)]*\)/) || [j])[0];

export default function Resultados({ partidos, equipos, grupos, temporada, competicion, onVerEquipo, onVerPartido }) {
  const [seccion, setSeccion] = useState('liga');
  const [grupo, setGrupo] = useState(null);
  const [fases, setFases] = useState(null);

  // Si el grupo activo no existe en la competición actual, usar el primero disponible
  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);

  useEffect(() => {
    setFases(null);
    fetch(`data/${competicion}/${temporada}/fases.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setFases)
      .catch(() => setFases([]));
  }, [competicion, temporada]);

  const porJornada = useMemo(() => {
    const m = new Map();
    partidos.filter(p => p.grupo === grupo).forEach(p => {
      const n = numJornada(p.jornada);
      if (!m.has(n)) m.set(n, { etiqueta: p.jornada, lista: [] });
      m.get(n).lista.push(p);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [partidos, grupo]);

  const jornadasDisponibles = porJornada.map(([n]) => n);
  const ultimaJornada = jornadasDisponibles[jornadasDisponibles.length - 1] || 1;
  const [jornadaSel, setJornadaSel] = useState(null);
  const jornadaActiva = jornadaSel ?? ultimaJornada;
  const jornadaData = porJornada.find(([n]) => n === jornadaActiva);

  const clasificacion = useMemo(() => {
    const jugados = partidos
      .filter(p => p.grupo === grupo && numJornada(p.jornada) <= jornadaActiva)
      .map(p => {
        const [gl, gv] = p.resultado.split('-').map(Number);
        return { p, gl, gv };
      })
      .filter(({ gl, gv }) => !isNaN(gl) && !isNaN(gv));

    const tab = {};
    const nombreEq = {};
    for (const { p, gl, gv } of jugados) {
      for (const lado of ['local', 'visitante']) {
        const eq = p[lado];
        if (!tab[eq.id]) tab[eq.id] = { id: eq.id, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0 };
        nombreEq[eq.id] = eq.nombre;
      }
      const L = tab[p.local.id], V = tab[p.visitante.id];
      L.pj++; V.pj++;
      L.pf += gl; L.pc += gv; V.pf += gv; V.pc += gl;
      if (gl > gv) { L.pg++; V.pp++; } else { V.pg++; L.pp++; }
    }

    const equiposArr = Object.values(tab).map(e => ({ ...e, nombre: nombreEq[e.id], dif: e.pf - e.pc }));

    const calcularParticular = (ids) => {
      const set = new Set(ids);
      const mini = {};
      ids.forEach(id => { mini[id] = { id, pg: 0, dif: 0, pf: 0 }; });
      for (const { p, gl, gv } of jugados) {
        if (set.has(p.local.id) && set.has(p.visitante.id)) {
          const L = mini[p.local.id], V = mini[p.visitante.id];
          L.pf += gl; V.pf += gv;
          L.dif += (gl - gv); V.dif += (gv - gl);
          if (gl > gv) L.pg++; else V.pg++;
        }
      }
      return mini;
    };

    const ordenarEmpatados = (grupoEmpatado) => {
      if (grupoEmpatado.length === 1) return grupoEmpatado;
      const ids = grupoEmpatado.map(e => e.id);
      const mini = calcularParticular(ids);
      const ordenados = [...grupoEmpatado].sort((a, b) => {
        const ma = mini[a.id], mb = mini[b.id];
        return mb.pg - ma.pg || mb.dif - ma.dif || b.dif - a.dif || b.pf - a.pf;
      });
      const resultado = [];
      let i = 0;
      while (i < ordenados.length) {
        let j = i + 1;
        while (j < ordenados.length &&
               mini[ordenados[j].id].pg === mini[ordenados[i].id].pg &&
               mini[ordenados[j].id].dif === mini[ordenados[i].id].dif) j++;
        const subgrupo = ordenados.slice(i, j);
        if (subgrupo.length > 1 && subgrupo.length < grupoEmpatado.length) {
          resultado.push(...ordenarEmpatados(subgrupo));
        } else {
          resultado.push(...subgrupo);
        }
        i = j;
      }
      return resultado;
    };

    const porVictorias = [...equiposArr].sort((a, b) => b.pg - a.pg);
    const final = [];
    let i = 0;
    while (i < porVictorias.length) {
      let j = i + 1;
      while (j < porVictorias.length && porVictorias[j].pg === porVictorias[i].pg) j++;
      const empatados = porVictorias.slice(i, j);
      final.push(...(empatados.length > 1 ? ordenarEmpatados(empatados) : empatados));
      i = j;
    }
    return final;
  }, [partidos, grupo, jornadaActiva]);

  const buscarEquipo = id => equipos.find(e => e.id === id);
  const clicEquipo = id => { const e = buscarEquipo(id); if (e) onVerEquipo(e); };
  const clicEquipoNombre = nombre => {
    const e = equipos.find(x => x.nombre === nombre);
    if (e) onVerEquipo(e);
  };

  const hayFases = Array.isArray(fases) && fases.length > 0;

  return (
    <>
      <div className="grupos">
        <button className={`boton-grupo ${seccion === 'liga' ? 'activo' : ''}`}
          onClick={() => setSeccion('liga')}>Liga regular</button>
        <button className={`boton-grupo ${seccion === 'fases' ? 'activo' : ''}`}
          onClick={() => setSeccion('fases')}
          disabled={!hayFases}
          title={hayFases ? '' : 'Sin fases descargadas para esta temporada'}>
          Fases de ascenso
        </button>
      </div>

      {seccion === 'liga' ? (
        <>
          <div className="grupos">
            {grupos.map(g => (
              <button key={g} className={`boton-grupo ${g === grupo ? 'activo' : ''}`}
                onClick={() => { setGrupo(g); setJornadaSel(null); }}>{g}</button>
            ))}
          </div>

          <div className="filtros">
            <label>
              Jornada{' '}
              <select value={jornadaActiva} onChange={e => setJornadaSel(+e.target.value)}>
                {porJornada.map(([n, d]) => (
                  <option key={n} value={n}>{etiquetaJornada(d.etiqueta)}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="inicio-dos-col">
            <div>
              <h3 className="seccion">Resultados · jornada {jornadaActiva}</h3>
              <div className="resultados-jornada">
                {jornadaData && jornadaData[1].lista.map(p => {
                  const [gl, gv] = p.resultado.split('-').map(Number);
                  const jugado = !isNaN(gl) && !isNaN(gv);
                  return (
                    <div className="resultado-card enlace-card" key={p.id}
                      onClick={() => jugado && onVerPartido(p.id)}>
                      <div className={`resultado-linea ${jugado && gl > gv ? 'gana' : ''}`}>
                        <span>{p.local.nombre}</span>
                        <span className="resultado-marca">{jugado ? gl : '-'}</span>
                      </div>
                      <div className={`resultado-linea ${jugado && gv > gl ? 'gana' : ''}`}>
                        <span>{p.visitante.nombre}</span>
                        <span className="resultado-marca">{jugado ? gv : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="seccion">Clasificación tras jornada {jornadaActiva}</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr><th>#</th><th className="izq">Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>PF</th><th>PC</th><th>Dif</th></tr>
                  </thead>
                  <tbody>
                    {clasificacion.map((e, i) => (
                      <tr key={e.id}>
                        <td>{i + 1}</td>
                        <td className="izq"><span className="enlace" onClick={() => clicEquipo(e.id)}>{e.nombre}</span></td>
                        <td>{e.pj}</td><td>{e.pg}</td><td>{e.pp}</td>
                        <td>{e.pf}</td><td>{e.pc}</td>
                        <td className={e.dif > 0 ? 'net-pos' : 'net-neg'}>{e.dif > 0 ? '+' : ''}{e.dif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="pie" style={{ marginTop: 4 }}>
                Clasificación con desempate por average particular entre los equipos igualados
                a victorias (enfrentamientos directos). En empates aún irresueltos se aplica
                diferencia de puntos general.
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <h3 className="seccion">Fases de ascenso · {`${temporada}/${(+temporada + 1).toString().slice(2)}`}</h3>
          {fases === null ? (
            <p className="cargando">Cargando fases…</p>
          ) : (
            competicion === 'tercerafeb' ? (
              <FasesAscenso fases={fases} onVerEquipoNombre={clicEquipoNombre} onVerPartido={onVerPartido} />
            ) : (
              <PlayOff fases={fases} onVerEquipoNombre={clicEquipoNombre} onVerPartido={onVerPartido} />
            )
          )}
          <p className="pie" style={{ marginTop: 8 }}>
            Los partidos de fases no computan en las estadísticas de temporada regular.
          </p>
        </>
      )}
    </>
  );
}
