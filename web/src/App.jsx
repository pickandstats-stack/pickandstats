import { useEffect, useState } from 'react';
import Inicio from './Inicio';
import Equipos from './Equipos';
import Jugadores from './Jugadores';
import Equipo from './Equipo';
import Comparador from './Comparador';
import Leyenda from './Leyenda';
import Jugador from './Jugador';

const GRUPOS = ['A-A','A-B','B-A','B-B','C-A','C-B','D-A','D-B','E-A','E-B'];
const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

export default function App() {
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [vista, setVista] = useState('inicio');
  const [equipoSel, setEquipoSel] = useState(null);
  const [jugadorSel, setJugadorSel] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch('data/temporadas.json')
      .then(r => r.json())
      .then(ts => { setTemporadas(ts); setTemporada(ts[0]); })
      .catch(err => console.error('Error cargando temporadas:', err));
  }, []);

  useEffect(() => {
    if (!temporada) return;
    setCargando(true);
    Promise.all([
      fetch(`data/${temporada}/equipos.json`).then(r => r.json()),
      fetch(`data/${temporada}/jugadores.json`).then(r => r.json()),
      fetch(`data/${temporada}/carreras.json`).then(r => r.json()),
      fetch(`data/${temporada}/partidos.json`).then(r => r.json())
    ])
      .then(([eq, jug, car, par]) => {
        setEquipos(eq); setJugadores(jug); setCarreras(car); setPartidos(par);
        setEquipoSel(null); setJugadorSel(null); setCargando(false);
      })
      .catch(err => { console.error('Error cargando datos:', err); setCargando(false); });
  }, [temporada]);

  const verEquipo = equipo => {
    setEquipoSel(equipo); setJugadorSel(null); window.scrollTo(0, 0);
  };

  const verJugador = idJugador => {
    const c = carreras.find(x => x.idJugador === idJugador);
    if (c) { setJugadorSel(c); setEquipoSel(null); window.scrollTo(0, 0); }
  };

  const irPestana = v => { setVista(v); setEquipoSel(null); setJugadorSel(null); };

  const pestana = (id, texto) => (
    <button className={`pestana ${vista === id && !equipoSel && !jugadorSel ? 'activa' : ''}`}
      onClick={() => irPestana(id)}>{texto}</button>
  );

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
        {pestana('inicio', 'Inicio')}
        {pestana('equipos', 'Equipos')}
        {pestana('jugadores', 'Jugadores')}
        {pestana('comparador', 'Comparador')}
        {pestana('leyenda', 'Leyenda')}
      </div>

      {cargando ? (
        <p className="cargando">Cargando datos…</p>
      ) : jugadorSel ? (
        <Jugador carrera={jugadorSel} equipos={equipos}
          onVolver={() => setJugadorSel(null)} onVerEquipo={verEquipo} />
      ) : equipoSel ? (
        <Equipo equipo={equipoSel} jugadores={jugadores} partidos={partidos}
          equipos={equipos} onVolver={() => setEquipoSel(null)}
          onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : vista === 'inicio' ? (
        <Inicio equipos={equipos} jugadores={jugadores} partidos={partidos}
          temporada={temporada} onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : vista === 'equipos' ? (
        <Equipos equipos={equipos} grupos={GRUPOS} onVerEquipo={verEquipo} />
      ) : vista === 'jugadores' ? (
        <Jugadores jugadores={jugadores} grupos={GRUPOS} equipos={equipos}
          onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : vista === 'comparador' ? (
        <Comparador equipos={equipos} grupos={GRUPOS} />
      ) : (
        <Leyenda />
      )}

      <p className="pie">
        Datos: baloncestoenvivo.feb.es · Cálculos propios · Partidos por
        sanción/incomparecencia excluidos de las métricas
      </p>
    </div>
  );
}
