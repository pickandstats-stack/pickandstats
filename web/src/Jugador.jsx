import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);
const etiquetaTemp = t => `${t}/${(+t + 1).toString().slice(2)}`;
const COLOR = { tinta: '#16233a', acento: '#e8622c' };

export default function Jugador({ carrera, historico, equipos, onVolver, onVerEquipo }) {
  const soloHistorico = carrera.soloHistorico === true;
  const multiEtapa = carrera.nEtapas > 1;

  const evolucion = useMemo(() => {
    if (soloHistorico || !carrera.etapas) return [];
    return carrera.etapas
      .flatMap(e => e.evolucion.map(p => ({
        jornada: numJornada(p.jornada),
        pt: p.pt, va: p.va, min: Math.round(p.seg / 60), equipo: e.equipo
      })))
      .sort((a, b) => a.jornada - b.jornada);
  }, [carrera, soloHistorico]);

  const trayectoria = useMemo(() => {
    if (!historico || !historico.temporadas) return [];
    return Object.entries(historico.temporadas)
      .map(([temp, d]) => ({ temp, ...d }))
      .sort((a, b) => a.temp.localeCompare(b.temp));
  }, [historico]);

  const dato = (etiqueta, valor) => (
    <div className="dato">
      <div className="dato-valor">{valor}</div>
      <div className="dato-etiqueta">{etiqueta}</div>
    </div>
  );

  const enlaceEquipo = etapa => {
    const eq = equipos.find(x => x.id === etapa.equipoId);
    return eq
      ? <span className="enlace" onClick={() => onVerEquipo(eq)}>{etapa.equipo}</span>
      : etapa.equipo;
  };

  // Cabecera: para jugador activo, sus etapas; para histórico, su última temporada registrada
  const subtitulo = soloHistorico
    ? `Última temporada registrada: ${etiquetaTemp(carrera.ultimaTemporada)} · no juega en la temporada seleccionada`
    : null;

  const tituloProduccion = soloHistorico
    ? `Temporada ${etiquetaTemp(carrera.ultimaTemporada)} · Producción`
    : 'Temporada actual · Producción';

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="ficha-cabecera">
        <div>
          <h2 className="ficha-nombre">{carrera.nombre}</h2>
          <p className="lema">
            {soloHistorico ? subtitulo : (
              <>
                {carrera.etapas.map((e, i) => (
                  <span key={e.equipoId}>
                    {i > 0 && ' → '}
                    {enlaceEquipo(e)} · {e.grupo}
                  </span>
                ))}
                {multiEtapa && '  ·  (totales combinados de todas las etapas)'}
              </>
            )}
          </p>
        </div>
        <div className="datos-bloque">
          <div className="datos-titulo">{tituloProduccion}</div>
          <div className="datos">
            {dato('PJ', carrera.pj)}
            {dato('MIN', carrera.minPorPartido)}
            {dato('PTS', carrera.ptPorPartido)}
            {dato('RO', carrera.roPorPartido)}
            {dato('RD', carrera.rdPorPartido)}
            {dato('REB', carrera.rtPorPartido)}
            {dato('AST', carrera.asPorPartido)}
            {dato('ROB', carrera.brPorPartido)}
            {dato('BP', carrera.bpPorPartido)}
            {dato('VAL', carrera.vaPorPartido)}
          </div>
          <div className="datos-titulo">Tiro y juego</div>
          <div className="datos">
            {dato('T2%', carrera.t2Pct)}
            {dato('T3%', carrera.t3Pct)}
            {dato('TL%', carrera.tlPct)}
            {dato('TS%', carrera.ts)}
            {dato('eFG%', carrera.efg)}
            {dato('TAP', carrera.tpPorPartido)}
            {dato('TR', carrera.tcoPorPartido)}
            {dato('FC', carrera.fcPorPartido)}
            {dato('FR', carrera.frPorPartido)}
            {!soloHistorico && dato('+/-', carrera.pm)}
          </div>
        </div>
      </div>

      {/* Estadística completa de la temporada actual — justo bajo la cabecera */}
      {!soloHistorico && (
        <>
          <h3 className="seccion">{multiEtapa ? 'Etapas · temporada actual' : 'Estadística completa · temporada actual'}</h3>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th className="izq">Equipo</th><th className="izq">Grupo</th>
                  <th>PJ</th><th>MIN</th><th>PTS</th><th>RO</th><th>RD</th><th>REB</th>
                  <th>AST</th><th>ROB</th><th>BP</th><th>TAP</th><th>FC</th><th>FR</th>
                  <th>T2</th><th>T3</th><th>TL</th>
                  <th>VAL</th><th>TS%</th><th>eFG%</th><th>USG%</th><th>+/-</th>
                </tr>
              </thead>
              <tbody>
                {carrera.etapas.map(e => (
                  <tr key={e.equipoId}>
                    <td className="izq">{enlaceEquipo(e)}</td>
                    <td className="izq">{e.grupo}</td>
                    <td>{e.pj}</td><td>{e.minPorPartido}</td><td>{e.ptPorPartido}</td>
                    <td>{e.roPorPartido}</td><td>{e.rdPorPartido}</td><td>{e.rtPorPartido}</td>
                    <td>{e.asPorPartido}</td><td>{e.brPorPartido}</td><td>{e.bpPorPartido}</td>
                    <td>{e.tpPorPartido}</td><td>{e.fcPorPartido}</td><td>{e.frPorPartido}</td>
                    <td>{e.t2} ({e.t2Pct}%)</td><td>{e.t3} ({e.t3Pct}%)</td><td>{e.tl} ({e.tlPct}%)</td>
                    <td>{e.vaPorPartido}</td><td>{e.ts}</td><td>{e.efg}</td><td>{e.usg}</td><td>{e.pm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pie">
            Los tiros (T2, T3, TL) se muestran como anotados/intentados totales de la etapa,
            con el porcentaje entre paréntesis. El resto son medias por partido.
          </p>
        </>
      )}

      {/* Trayectoria histórica */}
      {trayectoria.length >= 1 && (
        <>
          <h3 className="seccion">Trayectoria por temporada</h3>
          <div className="tabla-scroll tabla-ancha">
            <table>
              <thead>
                <tr>
                  <th className="izq">Temporada</th><th className="izq">Equipo(s)</th>
                  <th>PJ</th><th>MIN</th><th>PTS</th>
                  <th>RO</th><th>RD</th><th>REB</th><th>AST</th>
                  <th>ROB</th><th>BP</th><th>TAP</th><th>TR</th><th>FC</th><th>FR</th>
                  <th>T2%</th><th>T3%</th><th>TL%</th>
                  <th>VAL</th><th>TS%</th>
                </tr>
              </thead>
              <tbody>
                {trayectoria.map(t => (
                  <tr key={t.temp}>
                    <td className="izq">{etiquetaTemp(t.temp)}</td>
                    <td className="izq">{t.equipos.join(', ')}</td>
                    <td>{t.pj}</td><td>{t.minPorPartido}</td><td>{t.ptPorPartido}</td>
                    <td>{t.roPorPartido}</td><td>{t.rdPorPartido}</td><td>{t.rtPorPartido}</td>
                    <td>{t.asPorPartido}</td><td>{t.brPorPartido}</td><td>{t.bpPorPartido}</td>
                    <td>{t.tpPorPartido}</td><td>{t.tcoPorPartido}</td>
                    <td>{t.fcPorPartido}</td><td>{t.frPorPartido}</td>
                    <td>{t.t2Pct}</td><td>{t.t3Pct}</td><td>{t.tlPct}</td>
                    <td>{t.vaPorPartido}</td><td>{t.ts}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fila-total">
                  <td className="izq">CARRERA</td>
                  <td className="izq">{historico.carrera.nTemporadas} temporadas</td>
                  <td>{historico.carrera.pj}</td>
                  <td>{historico.carrera.minPorPartido}</td>
                  <td>{historico.carrera.ptPorPartido}</td>
                  <td>{historico.carrera.roPorPartido}</td>
                  <td>{historico.carrera.rdPorPartido}</td>
                  <td>{historico.carrera.rtPorPartido}</td>
                  <td>{historico.carrera.asPorPartido}</td>
                  <td>{historico.carrera.brPorPartido}</td>
                  <td>{historico.carrera.bpPorPartido}</td>
                  <td>{historico.carrera.tpPorPartido}</td>
                  <td>{historico.carrera.tcoPorPartido}</td>
                  <td>{historico.carrera.fcPorPartido}</td>
                  <td>{historico.carrera.frPorPartido}</td>
                  <td>{historico.carrera.t2Pct}</td>
                  <td>{historico.carrera.t3Pct}</td>
                  <td>{historico.carrera.tlPct}</td>
                  <td>{historico.carrera.vaPorPartido}</td>
                  <td>{historico.carrera.ts}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trayectoria.map(t => ({
                temporada: etiquetaTemp(t.temp),
                Puntos: t.ptPorPartido, Valoración: t.vaPorPartido
              }))} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
                <XAxis dataKey="temporada" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Puntos" fill={COLOR.acento} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Valoración" fill={COLOR.tinta} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="pie" style={{ marginTop: 4 }}>
              Promedios por partido en cada temporada disputada en categorías FEB registradas.
            </p>
          </div>
        </>
      )}

      {/* Evolución por jornada — solo para jugador de la temporada activa */}
      {!soloHistorico && (
        <>
          <h3 className="seccion">Evolución por jornada · temporada actual</h3>
          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolucion} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
                <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v, nombre) => [v, nombre === 'pt' ? 'Puntos' : 'Valoración']}
                  labelFormatter={(j, datos) => {
                    const d = datos && datos[0] && datos[0].payload;
                    return `Jornada ${j}${d ? ` · ${d.equipo} · ${d.min} min` : ''}`;
                  }}
                />
                <Legend formatter={v => v === 'pt' ? 'Puntos' : 'Valoración'} />
                <Line type="monotone" dataKey="pt" stroke={COLOR.acento} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="va" stroke={COLOR.tinta} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {soloHistorico && (
        <p className="pie">
          Este jugador no aparece en la temporada seleccionada. Se muestra su trayectoria
          en las temporadas registradas. Para ver su detalle por jornada, selecciona una
          temporada en la que haya jugado.
        </p>
      )}
    </div>
  );
}
