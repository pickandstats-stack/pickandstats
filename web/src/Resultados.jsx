import { useMemo, useState } from 'react';

const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);
const etiquetaJornada = j => (String(j).match(/Jornada\s*\d+\s*\([^)]*\)/) || [j])[0];

export default function Resultados({ partidos, equipos, grupos, onVerEquipo, onVerPartido }) {
  const [grupo, setGrupo] = useState('E-A');

  // Partidos del grupo, agrupados por número de jornada
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

  // Clasificación acumulada hasta la jornada activa (incluida)
  const clasificacion = useMemo(() => {
    const tab = {};
    const nombreEq = {};
    partidos.filter(p => p.grupo === grupo && numJornada(p.jornada) <= jornadaActiva)
      .forEach(p => {
        const [gl, gv] = p.resultado.split('-').map(Number);
        if (isNaN(gl) || isNaN(gv)) return;
        for (const lado of ['local', 'visitante']) {
          const eq = p[lado];
          if (!tab[eq.id]) tab[eq.id] = { id: eq.id, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0 };
          nombreEq[eq.id] = eq.nombre;
        }
        const L = tab[p.local.id], V = tab[p.visitante.id];
        L.pj++; V.pj++;
        L.pf += gl; L.pc += gv; V.pf += gv; V.pc += gl;
        if (gl > gv) { L.pg++; V.pp++; } else { V.pg++; L.pp++; }
      });
    return Object.values(tab).map(e => ({
      ...e, nombre: nombreEq[e.id], dif: e.pf - e.pc
    })).sort((a, b) => b.pg - a.pg || b.dif - a.dif || b.pf - a.pf);
  }, [partidos, grupo, jornadaActiva]);

  const buscarEquipo = id => equipos.find(e => e.id === id);
  const clicEquipo = id => { const e = buscarEquipo(id); if (e) onVerEquipo(e); };

  return (
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
          <div className="resultados-recientes">
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
            Clasificación por victorias; desempate por diferencia de puntos general.
            No aplica el average particular oficial de la FEB.
          </p>
        </div>
      </div>
    </>
  );
}
