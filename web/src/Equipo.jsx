import AnalisisEquipo from './AnalisisEquipo';
import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer
} from 'recharts';

const numJornada = j => parseInt((j.match(/\d+/) || [0])[0], 10);

const COLOR = { tinta: '#16233a', acento: '#e8622c', suave: '#9aa1ac' };

export default function Equipo({ equipo, jugadores, partidos, onVolver, onVerEquipo, onVerJugador, onVerPartido, equipos }) {
  const plantilla = useMemo(() =>
    jugadores.filter(j => j.equipoId === equipo.id)
      .sort((a, b) => b.vaPorPartido - a.vaPorPartido),
    [jugadores, equipo]);

  const calendario = useMemo(() =>
    partidos.filter(p => p.local.id === equipo.id || p.visitante.id === equipo.id)
      .sort((a, b) => numJornada(a.jornada) - numJornada(b.jornada)),
    [partidos, equipo]);

  const evolucion = useMemo(() => calendario.map(p => {
    const [gl, gv] = p.resultado.split('-').map(Number);
    const esLocal = p.local.id === equipo.id;
    return {
      jornada: numJornada(p.jornada),
      anotados: esLocal ? gl : gv,
      encajados: esLocal ? gv : gl,
      rival: (esLocal ? p.visitante : p.local).nombre
    };
  }).filter(d => d.anotados > 5 || d.encajados > 5),
  [calendario, equipo]);

  const fourFactors = useMemo(() => {
    const delGrupo = equipos.filter(e => e.grupo === equipo.grupo);
    const media = clave => delGrupo.reduce((a, e) => a + e[clave], 0) / delGrupo.length;
    return [
      { factor: 'eFG%', equipo: equipo.efg,    grupo: +media('efg').toFixed(2) },
      { factor: 'TOV%', equipo: equipo.tovPct, grupo: +media('tovPct').toFixed(2) },
      { factor: 'ORB%', equipo: equipo.orbPct, grupo: +media('orbPct').toFixed(2) },
      { factor: 'FTr',  equipo: equipo.ftRate, grupo: +media('ftRate').toFixed(2) },
    ];
  }, [equipos, equipo]);

  const resultadoPartido = p => {
    const [gl, gv] = p.resultado.split('-').map(Number);
    const esLocal = p.local.id === equipo.id;
    const gano = esLocal ? gl > gv : gv > gl;
    return { gano, marcador: p.resultado, esLocal, rival: esLocal ? p.visitante : p.local };
  };

  const buscarEquipo = id => equipos.find(e => e.id === id);

  const dato = (etiqueta, valor, clase) => (
    <div className="dato">
      <div className="dato-valor">{valor}</div>
      <div className={`dato-etiqueta ${clase || ''}`}>{etiqueta}</div>
    </div>
  );

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="ficha-cabecera">
        <div>
          <h2 className="ficha-nombre">{equipo.nombre}</h2>
          <p className="lema">Grupo {equipo.grupo} · {equipo.pg}-{equipo.pp} ·
            {' '}Casa {equipo.casa.pg}-{equipo.casa.pj - equipo.casa.pg} ·
            {' '}Fuera {equipo.fuera.pg}-{equipo.fuera.pj - equipo.fuera.pg}</p>
        </div>
        <div className="datos-bloque">
          <div className="datos-titulo">Básica · Anotación y tiro</div>
          <div className="datos">
            {dato('PF/part.', equipo.pfPartido)}
            {dato('PC/part.', equipo.pcPartido)}
            {dato('Dif.', (equipo.difPartido > 0 ? '+' : '') + equipo.difPartido,
              equipo.difPartido > 0 ? 'net-pos' : 'net-neg')}
            {dato('T2%', equipo.t2PctEq)}
            {dato('T3%', equipo.t3PctEq)}
            {dato('TL%', equipo.tlPctEq)}
          </div>
          <div className="datos-titulo">Básica · Juego</div>
          <div className="datos">
            {dato('RO', equipo.roPartido)}
            {dato('RD', equipo.rdPartido)}
            {dato('REB', equipo.rebPartido)}
            {dato('AST', equipo.asPartido)}
            {dato('ROB', equipo.brPartido)}
            {dato('BP', equipo.bpPartido)}
            {dato('FC', equipo.fcPartido)}
            {dato('FR', equipo.frPartido)}
            {dato('TAP', equipo.tapFavor)}
            {dato('TR', equipo.tapContra)}
          </div>
          <div className="datos-titulo">Global</div>
          <div className="datos">
            {dato('Net', equipo.netrtg, equipo.netrtg > 0 ? 'net-pos' : 'net-neg')}
            {dato('SRS', equipo.srs)}
            {dato('Pace', equipo.pace)}
            {dato('Últ. 5', equipo.forma5)}
            {dato('Suerte', (equipo.suerte > 0 ? '+' : '') + equipo.suerte)}
          </div>
          <div className="datos-titulo">Ataque</div>
          <div className="datos">
            {dato('ORtg', equipo.ortg)}
            {dato('eFG%', equipo.efg)}
            {dato('TS%', equipo.ts)}
            {dato('TOV%', equipo.tovPct)}
            {dato('ORB%', equipo.orbPct)}
            {dato('FTr', equipo.ftRate)}
            {dato('3PAr', equipo.t3ar)}
            {dato('AST%', equipo.astPct)}
          </div>
          <div className="datos-titulo">Defensa</div>
          <div className="datos">
            {dato('DRtg', equipo.drtg)}
            {dato('eFG% rival', equipo.efgRival)}
            {dato('TOV forz.', equipo.tovForzadas)}
            {dato('DRB%', equipo.drbPct)}
            {dato('FTr rival', equipo.ftrRival)}
          </div>
        </div>
      </div>
      <h3 className="seccion">Análisis del equipo</h3>
      <AnalisisEquipo equipo={equipo} equipos={equipos} />

      <h3 className="seccion">Evolución por jornada</h3>
      <div className="panel-grafico">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={evolucion} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
            <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip
              formatter={(v, nombre) => [v, nombre === 'anotados' ? 'Anotados' : 'Encajados']}
              labelFormatter={(j, datos) => {
                const d = datos && datos[0] && datos[0].payload;
                return `Jornada ${j}${d ? ' · vs ' + d.rival : ''}`;
              }}
            />
            <Legend formatter={v => v === 'anotados' ? 'Anotados' : 'Encajados'} />
            <Line type="monotone" dataKey="anotados" stroke={COLOR.acento} strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="encajados" stroke={COLOR.tinta} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="seccion">Four Factors vs media del grupo</h3>
      <div className="panel-grafico">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={fourFactors} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
            <XAxis dataKey="factor" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, nombre) => [v, nombre === 'equipo' ? equipo.nombre : `Media grupo ${equipo.grupo}`]} />
            <Legend formatter={v => v === 'equipo' ? equipo.nombre : `Media grupo ${equipo.grupo}`} />
            <Bar dataKey="equipo" fill={COLOR.acento} radius={[3, 3, 0, 0]} />
            <Bar dataKey="grupo" fill={COLOR.suave} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="pie" style={{ marginTop: 4 }}>
          En TOV% (pérdidas), menos es mejor; en el resto, más es mejor.
        </p>
      </div>

      <h3 className="seccion">Plantilla</h3>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th className="izq">Jugador</th><th>PJ</th><th>MIN</th><th>PTS</th>
              <th>REB</th><th>AST</th><th>ROB</th><th>BP</th><th>TAP</th>
              <th>T2%</th><th>T3%</th><th>TL%</th>
              <th>VAL</th><th>TS%</th><th>USG%</th>
            </tr>
          </thead>
          <tbody>
            {plantilla.map(j => (
              <tr key={j.nombre}>
                <td className="izq">
                  <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                </td>
                <td>{j.pj}</td><td>{j.minPorPartido}</td><td>{j.ptPorPartido}</td>
                <td>{j.rtPorPartido}</td><td>{j.asPorPartido}</td>
                <td>{j.brPorPartido}</td><td>{j.bpPorPartido}</td><td>{j.tpPorPartido}</td>
                <td>{j.t2Pct}</td><td>{j.t3Pct}</td><td>{j.tlPct}</td>
                <td>{j.vaPorPartido}</td><td>{j.ts}</td><td>{j.usg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="seccion">Resultados</h3>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Jor.</th><th className="izq">Rival</th><th className="izq">Sede</th>
              <th className="izq">Resultado</th><th>Marcador</th>
            </tr>
          </thead>
          <tbody>
            {calendario.map(p => {
              const r = resultadoPartido(p);
              const rivalObj = buscarEquipo(r.rival.id);
              return (
                <tr key={p.id}>
                  <td>{numJornada(p.jornada)}</td>
                  <td className="izq">
                    {rivalObj
                      ? <span className="enlace" onClick={() => onVerEquipo(rivalObj)}>{r.rival.nombre}</span>
                      : r.rival.nombre}
                  </td>
                  <td className="izq">{r.esLocal ? 'Casa' : 'Fuera'}</td>
                  <td className={`izq ${r.gano ? 'net-pos' : 'net-neg'}`}>{r.gano ? 'V' : 'D'}</td>
                  <td><span className="enlace" onClick={() => onVerPartido(p.id)}>{r.marcador}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
