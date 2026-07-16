import { useMemo, useState } from 'react';

const COLUMNAS = [
  { clave: 'nombre',  titulo: 'Equipo',  izq: true },
  { clave: 'pj',      titulo: 'PJ' },
  { clave: 'pg',      titulo: 'PG' },
  { clave: 'pp',      titulo: 'PP' },
  { clave: 'pace',    titulo: 'Pace',   tip: 'Posesiones por partido' },
  { clave: 'ortg',    titulo: 'ORtg',   tip: 'Puntos por 100 posesiones' },
  { clave: 'drtg',    titulo: 'DRtg',   tip: 'Puntos encajados por 100 posesiones' },
  { clave: 'netrtg',  titulo: 'Net',    tip: 'ORtg - DRtg' },
  { clave: 'efg',     titulo: 'eFG%',   tip: 'Tiro de campo efectivo' },
  { clave: 'tovPct',  titulo: 'TOV%',   tip: 'Pérdidas por 100 posesiones' },
  { clave: 'orbPct',  titulo: 'ORB%',   tip: '% rebote ofensivo' },
  { clave: 'ftRate',  titulo: 'FTr',    tip: 'TL intentados por 100 tiros de campo' },
];

export default function Equipos({ equipos, grupos }) {
  const [grupo, setGrupo] = useState('E-A');
  const [orden, setOrden] = useState({ clave: 'netrtg', desc: true });

  const filas = useMemo(() => {
    const f = equipos.filter(e => e.grupo === grupo);
    const { clave, desc } = orden;
    f.sort((a, b) => {
      const va = a[clave], vb = b[clave];
      if (typeof va === 'string') return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return desc ? vb - va : va - vb;
    });
    return f;
  }, [equipos, grupo, orden]);

  const clicOrden = clave =>
    setOrden(o => o.clave === clave ? { clave, desc: !o.desc } : { clave, desc: true });

  return (
    <>
      <div className="grupos">
        {grupos.map(g => (
          <button key={g} className={`boton-grupo ${g === grupo ? 'activo' : ''}`}
            onClick={() => setGrupo(g)}>{g}</button>
        ))}
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {COLUMNAS.map(c => (
                <th key={c.clave} title={c.tip || ''} onClick={() => clicOrden(c.clave)}
                  className={c.izq ? 'izq' : ''}>
                  {c.titulo}{orden.clave === c.clave ? (orden.desc ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                {COLUMNAS.map(c => (
                  <td key={c.clave}
                    className={[
                      c.izq ? 'izq' : '',
                      c.clave === 'netrtg' ? (e.netrtg > 0 ? 'net-pos' : 'net-neg') : ''
                    ].join(' ').trim()}>
                    {e[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
