import { useMemo, useState } from 'react';

const COMUNES = [
  { clave: 'nombre', titulo: 'Jugador', izq: true },
  { clave: 'equipo', titulo: 'Equipo',  izq: true },
  { clave: 'grupo',  titulo: 'Grupo',   izq: true },
  { clave: 'pj',     titulo: 'PJ' },
  { clave: 'minPorPartido', titulo: 'MIN', tip: 'Minutos por partido' },
];

const MODOS = {
  basica: [
    ...COMUNES,
    { clave: 'ptPorPartido', titulo: 'PTS' },
    { clave: 'roPorPartido', titulo: 'RO',  tip: 'Rebotes ofensivos' },
    { clave: 'rdPorPartido', titulo: 'RD',  tip: 'Rebotes defensivos' },
    { clave: 'rtPorPartido', titulo: 'REB', tip: 'Rebotes totales' },
    { clave: 'asPorPartido', titulo: 'AST' },
    { clave: 'brPorPartido', titulo: 'ROB' },
    { clave: 'bpPorPartido', titulo: 'BP',  tip: 'Pérdidas' },
    { clave: 'tpPorPartido', titulo: 'TAP', tip: 'Tapones a favor' },
    { clave: 'tcoPorPartido',titulo: 'TR',  tip: 'Tapones recibidos' },
    { clave: 'fcPorPartido', titulo: 'FC',  tip: 'Faltas cometidas' },
    { clave: 'frPorPartido', titulo: 'FR',  tip: 'Faltas recibidas' },
    { clave: 't2Pct',        titulo: 'T2%' },
    { clave: 't3Pct',        titulo: 'T3%' },
    { clave: 'tlPct',        titulo: 'TL%' },
    { clave: 'vaPorPartido', titulo: 'VAL' },
  ],
  avanzada: [
    ...COMUNES,
    { clave: 'ptPorPartido', titulo: 'PTS' },
    { clave: 'vaPorPartido', titulo: 'VAL' },
    { clave: 'ts',  titulo: 'TS%',  tip: 'True Shooting' },
    { clave: 'efg', titulo: 'eFG%', tip: 'Tiro de campo efectivo' },
    { clave: 'usg', titulo: 'USG%', tip: 'Posesiones usadas' },
    { clave: 'pm',  titulo: '+/-',  tip: 'Acumulado en pista' },
  ],
  per36: [
    ...COMUNES,
    { clave: 'per36.pt', titulo: 'PTS/36' },
    { clave: 'per36.rt', titulo: 'REB/36' },
    { clave: 'per36.as', titulo: 'AST/36' },
    { clave: 'per36.br', titulo: 'ROB/36' },
    { clave: 'per36.va', titulo: 'VAL/36' },
    { clave: 'ts',  titulo: 'TS%' },
    { clave: 'usg', titulo: 'USG%' },
  ],
};

const ORDEN_DEFECTO = { basica: 'ptPorPartido', avanzada: 'vaPorPartido', per36: 'per36.va' };

export default function Jugadores({ jugadores, grupos, equipos, onVerEquipo, onVerJugador }) {
  const [grupo, setGrupo] = useState('todos');
  const [equipoFiltro, setEquipoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [minPj, setMinPj] = useState(10);
  const [modo, setModo] = useState('basica');
  const [orden, setOrden] = useState({ clave: 'ptPorPartido', desc: true });
  const [limite, setLimite] = useState(50);

  const columnas = MODOS[modo];
  const valor = (j, clave) => clave.startsWith('per36.') ? j.per36[clave.split('.')[1]] : j[clave];

  const cambiarModo = m => { setModo(m); setOrden({ clave: ORDEN_DEFECTO[m], desc: true }); };

  // Equipos disponibles según el grupo elegido (derivados de los jugadores)
  const equiposDisponibles = useMemo(() => {
    const base = grupo === 'todos' ? jugadores : jugadores.filter(j => j.grupo === grupo);
    const mapa = new Map();
    base.forEach(j => { if (!mapa.has(j.equipoId)) mapa.set(j.equipoId, j.equipo); });
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [jugadores, grupo]);

  // Al cambiar de grupo, reiniciar el filtro de equipo
  const cambiarGrupo = g => { setGrupo(g); setEquipoFiltro('todos'); };

  const filas = useMemo(() => {
    let f = jugadores.filter(j => j.pj >= minPj);
    if (grupo !== 'todos') f = f.filter(j => j.grupo === grupo);
    if (equipoFiltro !== 'todos') f = f.filter(j => j.equipoId === equipoFiltro);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      f = f.filter(j => j.nombre.toLowerCase().includes(q) || j.equipo.toLowerCase().includes(q));
    }
    const { clave, desc } = orden;
    f.sort((a, b) => {
      const va = valor(a, clave), vb = valor(b, clave);
      if (typeof va === 'string') return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return desc ? vb - va : va - vb;
    });
    return f;
  }, [jugadores, grupo, equipoFiltro, busqueda, minPj, orden]);

  const clicOrden = clave =>
    setOrden(o => o.clave === clave ? { clave, desc: !o.desc } : { clave, desc: true });

  return (
    <>
      <div className="filtros">
        <input
          placeholder="Buscar jugador o equipo…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select value={grupo} onChange={e => cambiarGrupo(e.target.value)}>
          <option value="todos">Todos los grupos</option>
          {grupos.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={equipoFiltro} onChange={e => setEquipoFiltro(e.target.value)}>
          <option value="todos">Todos los equipos</option>
          {equiposDisponibles.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <label>
          Mín. partidos{' '}
          <input type="number" min="1" max="26" value={minPj}
            onChange={e => setMinPj(+e.target.value || 1)} style={{ width: 60 }} />
        </label>
        </div>

      <div className="filtros filtros-modo">
        <button className={`boton-grupo ${modo === 'basica' ? 'activo' : ''}`}
          onClick={() => cambiarModo('basica')}>Básica</button>
        <button className={`boton-grupo ${modo === 'avanzada' ? 'activo' : ''}`}
          onClick={() => cambiarModo('avanzada')}>Avanzada</button>
        <button className={`boton-grupo ${modo === 'per36' ? 'activo' : ''}`}
          onClick={() => cambiarModo('per36')}>Per-36</button>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {columnas.map(c => (
                <th key={c.clave} title={c.tip || ''} onClick={() => clicOrden(c.clave)}
                  className={c.izq ? 'izq' : ''}>
                  {c.titulo}{orden.clave === c.clave ? (orden.desc ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.slice(0, limite).map((j, i) => (
              <tr key={`${j.equipoId}|${j.nombre}`}>
                <td>{i + 1}</td>
                {columnas.map(c => (
                  <td key={c.clave} className={c.izq ? 'izq' : ''}>
                    {c.clave === 'equipo'
                      ? <span className="enlace" onClick={() => {
                          const eq = equipos.find(x => x.id === j.equipoId);
                          if (eq) onVerEquipo(eq);
                        }}>{j.equipo}</span>
                      : c.clave === 'nombre'
                      ? <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                      : valor(j, c.clave)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length > limite && (
        <button className="boton-mas" onClick={() => setLimite(l => l + 50)}>
          Mostrar más ({filas.length - limite} restantes)
        </button>
      )}
    </>
  );
}
