import { useMemo, useState } from 'react';

const COLUMNAS = [
  { clave: 'nombre',        titulo: 'Jugador', izq: true },
  { clave: 'equipo',        titulo: 'Equipo',  izq: true },
  { clave: 'grupo',         titulo: 'Grupo',   izq: true },
  { clave: 'pj',            titulo: 'PJ' },
  { clave: 'minPorPartido', titulo: 'MIN',  tip: 'Minutos por partido' },
  { clave: 'ptPorPartido',  titulo: 'PTS',  tip: 'Puntos por partido' },
  { clave: 'vaPorPartido',  titulo: 'VAL',  tip: 'Valoración por partido' },
  { clave: 'ts',            titulo: 'TS%',  tip: 'True Shooting' },
  { clave: 'efg',           titulo: 'eFG%', tip: 'Tiro de campo efectivo' },
  { clave: 't3Pct',         titulo: 'T3%' },
  { clave: 'tlPct',         titulo: 'TL%' },
  { clave: 'usg',           titulo: 'USG%', tip: 'Posesiones usadas' },
];

const PER36 = [
  { clave: 'pt', titulo: 'PTS/36' },
  { clave: 'rt', titulo: 'REB/36' },
  { clave: 'as', titulo: 'AST/36' },
  { clave: 'br', titulo: 'ROB/36' },
  { clave: 'va', titulo: 'VAL/36' },
];

export default function Jugadores({ jugadores, grupos }) {
  const [grupo, setGrupo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [minPj, setMinPj] = useState(10);
  const [modo36, setModo36] = useState(false);
  const [orden, setOrden] = useState({ clave: 'vaPorPartido', desc: true });
  const [limite, setLimite] = useState(50);

  const filas = useMemo(() => {
    let f = jugadores.filter(j => j.pj >= minPj);
    if (grupo !== 'todos') f = f.filter(j => j.grupo === grupo);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      f = f.filter(j => j.nombre.toLowerCase().includes(q) || j.equipo.toLowerCase().includes(q));
    }
    const { clave, desc } = orden;
    const valor = j => clave.startsWith('per36.') ? j.per36[clave.split('.')[1]] : j[clave];
    f.sort((a, b) => {
      const va = valor(a), vb = valor(b);
      if (typeof va === 'string') return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return desc ? vb - va : va - vb;
    });
    return f;
  }, [jugadores, grupo, busqueda, minPj, orden]);

  const clicOrden = clave =>
    setOrden(o => o.clave === clave ? { clave, desc: !o.desc } : { clave, desc: true });

  const columnas = modo36
    ? [...COLUMNAS.slice(0, 5), ...PER36.map(c => ({ ...c, clave: `per36.${c.clave}` })), COLUMNAS[7], COLUMNAS[11]]
    : COLUMNAS;

  const celda = (j, clave) => clave.startsWith('per36.') ? j.per36[clave.split('.')[1]] : j[clave];

  return (
    <>
      <div className="filtros">
        <input
          placeholder="Buscar jugador o equipo…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select value={grupo} onChange={e => setGrupo(e.target.value)}>
          <option value="todos">Todos los grupos</option>
          {grupos.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <label>
          Mín. partidos{' '}
          <input type="number" min="1" max="26" value={minPj}
            onChange={e => setMinPj(+e.target.value || 1)} style={{ width: 60 }} />
        </label>
        <label>
          <input type="checkbox" checked={modo36} onChange={e => setModo36(e.target.checked)} />
          {' '}Ver per-36
        </label>
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
                  <td key={c.clave} className={c.izq ? 'izq' : ''}>{celda(j, c.clave)}</td>
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
