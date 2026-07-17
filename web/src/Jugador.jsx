import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);
const COLOR = { tinta: '#16233a', acento: '#e8622c' };

export default function Jugador({ carrera, equipos, onVolver, onVerEquipo }) {
  const multiEtapa = carrera.nEtapas > 1;

  const evolucion = useMemo(() =>
    carrera.etapas
      .flatMap(e => e.evolucion.map(p => ({
        jornada: numJornada(p.jornada),
        pt: p.pt,
        va: p.va,
        min: Math.round(p.seg / 60),
        equipo: e.equipo
      })))
      .sort((a, b) => a.jornada - b.jornada),
    [carrera]);

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

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="ficha-cabecera">
        <div>
          <h2 className="ficha-nombre">{carrera.nombre}</h2>
          <p className="lema">
            {carrera.etapas.map((e, i) => (
              <span key={e.equipoId}>
                {i > 0 && ' → '}
                {enlaceEquipo(e)} · {e.grupo}
              </span>
            ))}
            {multiEtapa && '  ·  (totales combinados de todas las etapas)'}
          </p>
        </div>
        <div className="datos-bloque">
          <div className="datos-titulo">Temporada 2025/26 · Producción</div>
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
            {dato('+/-', carrera.pm)}
          </div>
        </div>
      </div>

      <h3 className="seccion">Evolución por jornada</h3>
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

      <h3 className="seccion">{multiEtapa ? 'Etapas' : 'Estadística completa'}</h3>
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
    </div>
  );
}
