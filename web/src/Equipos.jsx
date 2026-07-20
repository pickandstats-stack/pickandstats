import { useEffect, useMemo, useState } from 'react';

const BASICA = [
  { clave: 'nombre',    titulo: 'Equipo', izq: true },
  { clave: 'pj',        titulo: 'PJ' },
  { clave: 'pg',        titulo: 'PG' },
  { clave: 'pp',        titulo: 'PP' },
  { clave: 'pfPartido', titulo: 'PF',   tip: 'Puntos a favor por partido' },
  { clave: 'pcPartido', titulo: 'PC',   tip: 'Puntos en contra por partido' },
  { clave: 'difPartido',titulo: 'Dif.', tip: 'Diferencia media por partido' },
  { clave: 't2PctEq',   titulo: 'T2%' },
  { clave: 't3PctEq',   titulo: 'T3%' },
  { clave: 'tlPctEq',   titulo: 'TL%' },
  { clave: 'roPartido', titulo: 'RO',   tip: 'Rebotes ofensivos por partido' },
  { clave: 'rdPartido', titulo: 'RD',   tip: 'Rebotes defensivos por partido' },
  { clave: 'rebPartido',titulo: 'REB',  tip: 'Rebotes totales por partido' },
  { clave: 'asPartido', titulo: 'AST',  tip: 'Asistencias por partido' },
  { clave: 'brPartido', titulo: 'ROB',  tip: 'Robos por partido' },
  { clave: 'bpPartido', titulo: 'BP',   tip: 'Pérdidas por partido' },
  { clave: 'fcPartido', titulo: 'FC',   tip: 'Faltas cometidas por partido' },
  { clave: 'frPartido', titulo: 'FR',   tip: 'Faltas recibidas por partido' },
  { clave: 'tapFavor',  titulo: 'TAP',  tip: 'Tapones a favor por partido' },
  { clave: 'tapContra', titulo: 'TR',   tip: 'Tapones recibidos por partido' },
];

const AVANZADA = [
  { clave: 'nombre',  titulo: 'Equipo', izq: true },
  { clave: 'pj',      titulo: 'PJ' },
  { clave: 'pg',      titulo: 'PG' },
  { clave: 'pp',      titulo: 'PP' },
  { clave: 'pace',    titulo: 'Pace',  tip: 'Posesiones por partido' },
  { clave: 'ortg',    titulo: 'ORtg',  tip: 'Puntos por 100 posesiones' },
  { clave: 'drtg',    titulo: 'DRtg',  tip: 'Puntos encajados por 100 posesiones' },
  { clave: 'netrtg',  titulo: 'Net',   tip: 'ORtg - DRtg' },
  { clave: 'srs',     titulo: 'SRS',   tip: 'Net ajustado por calendario (comparable dentro del grupo)' },
  { clave: 'forma5',  titulo: 'Últ.5', tip: 'Récord últimos 5 partidos' },
  { clave: 'efg',     titulo: 'eFG%',  tip: 'Tiro de campo efectivo' },
  { clave: 'tovPct',  titulo: 'TOV%',  tip: 'Pérdidas por 100 posesiones' },
  { clave: 'orbPct',  titulo: 'ORB%',  tip: '% rebote ofensivo' },
  { clave: 'ftRate',  titulo: 'FTr',   tip: 'TL intentados por 100 tiros de campo' },
];

export default function Equipos({ equipos, grupos, onVerEquipo }) {
  const [grupo, setGrupo] = useState(null);

  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);
  const [modo, setModo] = useState('basica');
  const [orden, setOrden] = useState({ clave: 'pg', desc: true });

  const columnas = modo === 'basica' ? BASICA : AVANZADA;

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
        <span className="separador" />
        <button className={`boton-grupo ${modo === 'basica' ? 'activo' : ''}`}
          onClick={() => setModo('basica')}>Básica</button>
        <button className={`boton-grupo ${modo === 'avanzada' ? 'activo' : ''}`}
          onClick={() => setModo('avanzada')}>Avanzada</button>
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
            {filas.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                {columnas.map(c => (
                  <td key={c.clave}
                    className={[
                      c.izq ? 'izq' : '',
                      (c.clave === 'netrtg' || c.clave === 'difPartido')
                        ? (e[c.clave] > 0 ? 'net-pos' : 'net-neg') : ''
                    ].join(' ').trim()}>
                    {c.clave === 'nombre'
                      ? <span className="enlace" onClick={() => onVerEquipo(e)}>{e.nombre}</span>
                      : e[c.clave]}
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
