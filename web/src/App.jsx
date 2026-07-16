import { useEffect, useState } from 'react';
import Equipos from './Equipos';
import Jugadores from './Jugadores';

const GRUPOS = ['A-A','A-B','B-A','B-B','C-A','C-B','D-A','D-B','E-A','E-B'];
const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

export default function App() {
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [vista, setVista] = useState('equipos');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch('/data/temporadas.json')
      .then(r => r.json())
      .then(ts => { setTemporadas(ts); setTemporada(ts[0]); })
      .catch(err => console.error('Error cargando temporadas:', err));
  }, []);

  useEffect(() => {
    if (!temporada) return;
    setCargando(true);
    Promise.all([
      fetch(`/data/${temporada}/equipos.json`).then(r => r.json()),
      fetch(`/data/${temporada}/jugadores.json`).then(r => r.json())
    ])
      .then(([eq, jug]) => { setEquipos(eq); setJugadores(jug); setCargando(false); })
      .catch(err => { console.error('Error cargando datos:', err); setCargando(false); });
  }, [temporada]);

  return (
    <div className="contenedor">
      <div className="cabecera">
        <div>
          <h1 className="marca">Pick<span>&</span>Stats</h1>
          <p className="lema">Estadísticas avanzadas · Tercera FEB</p>
        </div>
        <label>
          Temporada{' '}
          <select value={temporada || ''} onChange={e => setTemporada(e.target.value)}>
            {temporadas.map(t => <option key={t} value={t}>{etiquetaTemporada(t)}</option>)}
          </select>
        </label>
      </div>

      <div className="pestanas">
        <button className={`pestana ${vista === 'equipos' ? 'activa' : ''}`}
          onClick={() => setVista('equipos')}>Equipos</button>
        <button className={`pestana ${vista === 'jugadores' ? 'activa' : ''}`}
          onClick={() => setVista('jugadores')}>Jugadores</button>
      </div>

      {cargando ? (
        <p className="cargando">Cargando datos…</p>
      ) : vista === 'equipos' ? (
        <Equipos equipos={equipos} grupos={GRUPOS} />
      ) : (
        <Jugadores jugadores={jugadores} grupos={GRUPOS} />
      )}

      <p className="pie">
        Datos: baloncestoenvivo.feb.es · Cálculos propios · Partidos por
        sanción/incomparecencia excluidos de las métricas
      </p>
    </div>
  );
}
