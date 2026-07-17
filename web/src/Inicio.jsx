import { useMemo, useState } from 'react';

const MIN_PJ = 12;
const GRUPOS = ['A-A','A-B','B-A','B-B','C-A','C-B','D-A','D-B','E-A','E-B'];

const fecha = j => {
  const m = String(j).match(/\((\d{2})\/(\d{2})\/(\d{4})\)/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0);
};

export default function Inicio({ equipos, jugadores, partidos, onVerEquipo, onVerJugador, onVerPartido, temporada }) {
  const etiquetaTemp = `${temporada}/${(+temporada + 1).toString().slice(2)}`;

  // Grupos seleccionados (todos activos por defecto)
  const [sel, setSel] = useState(() => new Set(GRUPOS));

  const toggle = g => setSel(prev => {
    const n = new Set(prev);
    n.has(g) ? n.delete(g) : n.add(g);
    return n;
  });
  const todos = () => setSel(new Set(GRUPOS));
  const ninguno = () => setSel(new Set());
  const activo = g => sel.has(g);
  const hayFiltro = sel.size > 0 && sel.size < GRUPOS.length;

  // Filtrado base por grupos seleccionados
  const equiposF = useMemo(() => equipos.filter(e => sel.has(e.grupo)), [equipos, sel]);
  const jugadoresF = useMemo(() => jugadores.filter(j => sel.has(j.grupo)), [jugadores, sel]);
  const partidosF = useMemo(() => partidos.filter(p => sel.has(p.grupo)), [partidos, sel]);

  const elegibles = useMemo(() => jugadoresF.filter(j => j.pj >= MIN_PJ), [jugadoresF]);
  const lider = clave => [...elegibles].sort((a, b) => b[clave] - a[clave]).slice(0, 5);

  const cardsLideres = [
    { titulo: 'Anotación', clave: 'ptPorPartido', sufijo: 'pts' },
    { titulo: 'Valoración', clave: 'vaPorPartido', sufijo: 'val' },
    { titulo: 'Rebotes', clave: 'rtPorPartido', sufijo: 'reb' },
    { titulo: 'Asistencias', clave: 'asPorPartido', sufijo: 'ast' },
  ];

  const dominantes = useMemo(() =>
    [...equiposF].sort((a, b) => b.srs - a.srs).slice(0, 8), [equiposF]);

  const enRacha = useMemo(() => {
    const victorias = e => parseInt((e.forma5 || '0-0').split('-')[0], 10);
    return [...equiposF]
      .sort((a, b) => victorias(b) - victorias(a) || b.forma5Dif - a.forma5Dif)
      .slice(0, 5);
  }, [equiposF]);

  const ultimos = useMemo(() =>
    [...partidosF].sort((a, b) => fecha(b.jornada) - fecha(a.jornada)).slice(0, 8),
    [partidosF]);

  const buscarEquipo = id => equipos.find(e => e.id === id);
  const clicEquipoId = id => { const e = buscarEquipo(id); if (e) onVerEquipo(e); };

  const alcance = hayFiltro
    ? `Grupos ${[...sel].sort().join(', ')}`
    : 'Todos los grupos';

  return (
    <div className="inicio">
      <div className="inicio-intro">
        <p>La referencia de estadística avanzada de la Tercera FEB. Temporada {etiquetaTemp}
          {' '}· {equipos.length} equipos · {jugadores.length} jugadores en 10 grupos.</p>
      </div>

      <div className="filtro-grupos">
        <div className="filtro-grupos-botones">
          {GRUPOS.map(g => (
            <button key={g} className={`boton-grupo ${activo(g) ? 'activo' : ''}`}
              onClick={() => toggle(g)}>{g}</button>
          ))}
          <span className="separador" />
          <button className="boton-grupo" onClick={todos}>Todos</button>
          <button className="boton-grupo" onClick={ninguno}>Ninguno</button>
        </div>
      </div>

      {sel.size === 0 ? (
        <p className="cargando">Selecciona al menos un grupo para ver los datos.</p>
      ) : (
        <>
          <h3 className="seccion">Líderes {hayFiltro ? `· ${alcance}` : 'de la temporada'}</h3>
          <div className="cards-lideres">
            {cardsLideres.map(card => {
              const top = lider(card.clave);
              const cabeza = top[0];
              return (
                <div className="card-lider" key={card.clave}>
                  <div className="card-titulo">{card.titulo}</div>
                  {cabeza ? (
                    <>
                      <div className="card-cabeza">
                        <div className="card-valor">{cabeza[card.clave]}
                          <span className="card-sufijo"> {card.sufijo}</span></div>
                        <div className="card-nombre enlace"
                          onClick={() => onVerJugador(cabeza.idJugador)}>{cabeza.nombre}</div>
                        <div className="card-equipo">{cabeza.equipo} · {cabeza.grupo}</div>
                      </div>
                      <ol className="card-lista">
                        {top.slice(1).map(j => (
                          <li key={`${j.equipoId}|${j.nombre}`}>
                            <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                            <span className="card-mini-val">{j[card.clave]}</span>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : (
                    <p className="card-vacio">Sin datos suficientes</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="inicio-dos-col">
            <div>
              <h3 className="seccion">Equipos dominantes</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr><th>#</th><th className="izq">Equipo</th><th>Gr.</th><th>V-D</th><th>SRS</th><th>Net</th></tr>
                  </thead>
                  <tbody>
                    {dominantes.map((e, i) => (
                      <tr key={e.id}>
                        <td>{i + 1}</td>
                        <td className="izq"><span className="enlace" onClick={() => onVerEquipo(e)}>{e.nombre}</span></td>
                        <td>{e.grupo}</td>
                        <td>{e.pg}-{e.pp}</td>
                        <td>{e.srs}</td>
                        <td className={e.netrtg > 0 ? 'net-pos' : 'net-neg'}>{e.netrtg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="seccion">En racha · últimos 5</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr><th className="izq">Equipo</th><th>Gr.</th><th>Últ.5</th><th>Dif.</th></tr>
                  </thead>
                  <tbody>
                    {enRacha.map(e => (
                      <tr key={e.id}>
                        <td className="izq"><span className="enlace" onClick={() => onVerEquipo(e)}>{e.nombre}</span></td>
                        <td>{e.grupo}</td>
                        <td>{e.forma5}</td>
                        <td className={e.forma5Dif > 0 ? 'net-pos' : 'net-neg'}>
                          {e.forma5Dif > 0 ? '+' : ''}{e.forma5Dif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h3 className="seccion">Últimos resultados</h3>
          <div className="resultados-recientes">
            {ultimos.map(p => {
              const [gl, gv] = p.resultado.split('-').map(Number);
              return (
                <div className="resultado-card enlace-card" key={p.id} onClick={() => onVerPartido(p.id)}>
                  <div className="resultado-grupo">{p.grupo}</div>
                  <div className={`resultado-linea ${gl > gv ? 'gana' : ''}`}>
                    <span className="enlace" onClick={() => clicEquipoId(p.local.id)}>{p.local.nombre}</span>
                    <span className="resultado-marca">{gl}</span>
                  </div>
                  <div className={`resultado-linea ${gv > gl ? 'gana' : ''}`}>
                    <span className="enlace" onClick={() => clicEquipoId(p.visitante.id)}>{p.visitante.nombre}</span>
                    <span className="resultado-marca">{gv}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
