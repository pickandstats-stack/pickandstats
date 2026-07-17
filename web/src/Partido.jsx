import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

const COLOR = { local: '#e8622c', visitante: '#16233a' };

export default function Partido({ partido, equipos, onVolver, onVerEquipo, onVerJugador }) {
  const [gl, gv] = partido.resultado.split('-').map(Number);
  const cuartos = partido.cuartos || [];

  const evolucion = useMemo(() => {
    let al = 0, av = 0;
    return cuartos.map(c => {
      al += c.local; av += c.visitante;
      return { periodo: c.periodo.replace('º C', 'Q').replace(' ', ''), local: al, visitante: av };
    });
  }, [cuartos]);

  const enlaceEquipo = eq => {
    const e = equipos.find(x => x.id === eq.id);
    return e
      ? <span className="enlace" onClick={() => onVerEquipo(e)}>{eq.nombre}</span>
      : eq.nombre;
  };

  // Suma de una columna del boxscore
  const total = (box, fn) => box.reduce((a, j) => a + fn(j), 0);
  const seg2min = s => Math.round(s / 60);

  const tablaBox = (box, nombre) => {
    const t = {
      pt: total(box, j => j.pt),
      t2a: total(box, j => j.t2.a), t2i: total(box, j => j.t2.i),
      t3a: total(box, j => j.t3.a), t3i: total(box, j => j.t3.i),
      tla: total(box, j => j.tl.a), tli: total(box, j => j.tl.i),
      ro: total(box, j => j.ro), rd: total(box, j => j.rd), rt: total(box, j => j.rt),
      as: total(box, j => j.as), br: total(box, j => j.br), bp: total(box, j => j.bp),
      tf: total(box, j => j.tf), tco: total(box, j => j.tco),
      fc: total(box, j => j.fc), fr: total(box, j => j.fr), va: total(box, j => j.va)
    };
    return (
      <>
        <h3 className="seccion">{nombre}</h3>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th className="izq">Jugador</th><th>MIN</th><th>PTS</th>
                <th>T2</th><th>T3</th><th>TL</th>
                <th>RO</th><th>RD</th><th>REB</th><th>AST</th>
                <th>ROB</th><th>BP</th><th>TAP</th><th>TR</th>
                <th>FC</th><th>FR</th><th>VAL</th>
              </tr>
            </thead>
            <tbody>
              {box.map(j => (
                <tr key={j.nombre}>
                  <td className="izq">
                    {j.idJugador
                      ? <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                      : j.nombre}
                  </td>
                  <td>{seg2min(j.seg)}</td>
                  <td>{j.pt}</td>
                  <td>{j.t2.a}/{j.t2.i}</td>
                  <td>{j.t3.a}/{j.t3.i}</td>
                  <td>{j.tl.a}/{j.tl.i}</td>
                  <td>{j.ro}</td><td>{j.rd}</td><td>{j.rt}</td><td>{j.as}</td>
                  <td>{j.br}</td><td>{j.bp}</td><td>{j.tf}</td><td>{j.tco}</td>
                  <td>{j.fc}</td><td>{j.fr}</td><td>{j.va}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fila-total">
                <td className="izq">TOTAL</td>
                <td>—</td>
                <td>{t.pt}</td>
                <td>{t.t2a}/{t.t2i}</td>
                <td>{t.t3a}/{t.t3i}</td>
                <td>{t.tla}/{t.tli}</td>
                <td>{t.ro}</td><td>{t.rd}</td><td>{t.rt}</td><td>{t.as}</td>
                <td>{t.br}</td><td>{t.bp}</td><td>{t.tf}</td><td>{t.tco}</td>
                <td>{t.fc}</td><td>{t.fr}</td><td>{t.va}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </>
    );
  };

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="partido-marcador">
        <div className="partido-grupo">{partido.grupo} · {partido.jornada}</div>
        <div className="partido-equipos">
          <div className={`partido-equipo ${gl > gv ? 'gana' : ''}`}>
            <span className="partido-nombre">{enlaceEquipo(partido.local)}</span>
            <span className="partido-tanteo">{gl}</span>
          </div>
          <div className={`partido-equipo ${gv > gl ? 'gana' : ''}`}>
            <span className="partido-nombre">{enlaceEquipo(partido.visitante)}</span>
            <span className="partido-tanteo">{gv}</span>
          </div>
        </div>
      </div>

      {cuartos.length > 0 && (
        <>
          <h3 className="seccion">Marcador por cuartos</h3>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th className="izq">Equipo</th>
                  {cuartos.map((c, i) => <th key={i}>{c.periodo}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="izq">{partido.local.nombre}</td>
                  {cuartos.map((c, i) => <td key={i}>{c.local}</td>)}
                  <td style={{ fontWeight: 600 }}>{gl}</td>
                </tr>
                <tr>
                  <td className="izq">{partido.visitante.nombre}</td>
                  {cuartos.map((c, i) => <td key={i}>{c.visitante}</td>)}
                  <td style={{ fontWeight: 600 }}>{gv}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucion} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend formatter={v => v === 'local' ? partido.local.nombre : partido.visitante.nombre} />
                <Line type="monotone" dataKey="local" stroke={COLOR.local} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="visitante" stroke={COLOR.visitante} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="pie" style={{ marginTop: 4 }}>Marcador acumulado al final de cada periodo.</p>
          </div>
        </>
      )}

      {partido.boxscore && partido.boxscore.local && (
        <>
          {tablaBox(partido.boxscore.local, partido.local.nombre)}
          {tablaBox(partido.boxscore.visitante, partido.visitante.nombre)}
        </>
      )}
    </div>
  );
}
