import { useEffect, useState } from 'react';
import Inicio from './Inicio';
import Equipos from './Equipos';
import Jugadores from './Jugadores';
import Equipo from './Equipo';
import Leyenda from './Leyenda';
import Jugador from './Jugador';
import Partido from './Partido';
import Resultados from './Resultados';
import Legal from './Legal';
import Buscador from './Buscador';

const GRUPOS = ['A-A','A-B','B-A','B-B','C-A','C-B','D-A','D-B','E-A','E-B'];
const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

export default function App() {
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [vista, setVista] = useState('inicio');
  const [equipoSel, setEquipoSel] = useState(null);
  const [jugadorSel, setJugadorSel] = useState(null);
  const [partidoSel, setPartidoSel] = useState(null);
  const [legalVisible, setLegalVisible] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch('data/temporadas.json')
      .then(r => r.json())
      .then(ts => { setTemporadas(ts); setTemporada(ts[0]); })
      .catch(err => console.error('Error cargando temporadas:', err));
    fetch('data/historico.json')
      .then(r => r.json())
      .then(setHistorico)
      .catch(err => console.error('Error cargando histórico:', err));
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
        setEquipoSel(null); setJugadorSel(null); setPartidoSel(null); setCargando(false);
      })
      .catch(err => { console.error('Error cargando datos:', err); setCargando(false); });
  }, [temporada]);

  const verEquipo = equipo => {
    setEquipoSel(equipo); setJugadorSel(null); setPartidoSel(null); setLegalVisible(false); window.scrollTo(0, 0);
  };

  const carreraDesdeHistorico = h => {
    const temps = Object.keys(h.temporadas || {}).sort();
    const ultima = temps[temps.length - 1];
    const d = h.temporadas[ultima] || {};
    return {
      idJugador: h.idJugador,
      nombre: h.nombre,
      nEtapas: 1,
      soloHistorico: true,
      pj: d.pj || 0,
      minPorPartido: d.minPorPartido || 0,
      ptPorPartido: d.ptPorPartido || 0,
      roPorPartido: d.roPorPartido || 0,
      rdPorPartido: d.rdPorPartido || 0,
      rtPorPartido: d.rtPorPartido || 0,
      asPorPartido: d.asPorPartido || 0,
      brPorPartido: d.brPorPartido || 0,
      bpPorPartido: d.bpPorPartido || 0,
      tpPorPartido: d.tpPorPartido || 0,
      tcoPorPartido: d.tcoPorPartido || 0,
      fcPorPartido: d.fcPorPartido || 0,
      frPorPartido: d.frPorPartido || 0,
      vaPorPartido: d.vaPorPartido || 0,
      t2Pct: d.t2Pct || 0, t3Pct: d.t3Pct || 0, tlPct: d.tlPct || 0,
      ts: d.ts || 0, efg: d.efg || 0, pm: 0,
      ultimaTemporada: ultima,
      etapas: []
    };
  };

  const verJugador = idJugador => {
    const c = carreras.find(x => x.idJugador === idJugador);
    if (c) {
      setJugadorSel(c);
    } else {
      const h = historico.find(x => x.idJugador === idJugador);
      if (!h) return;
      setJugadorSel(carreraDesdeHistorico(h));
    }
    setEquipoSel(null); setPartidoSel(null); setLegalVisible(false); window.scrollTo(0, 0);
  };

  const verPartido = idPartido => {
    const p = partidos.find(x => x.id === idPartido);
    if (p) { setPartidoSel(p); setEquipoSel(null); setJugadorSel(null); setLegalVisible(false); window.scrollTo(0, 0); }
  };

  const irPestana = v => {
    setVista(v); setEquipoSel(null); setJugadorSel(null); setPartidoSel(null); setLegalVisible(false);
  };
  const abrirLegal = () => {
    setLegalVisible(true); setEquipoSel(null); setJugadorSel(null); setPartidoSel(null); window.scrollTo(0, 0);
  };

  const sinSeleccion = !equipoSel && !jugadorSel && !partidoSel && !legalVisible;

  const pestana = (id, texto) => (
    <button className={`pestana ${vista === id && sinSeleccion ? 'activa' : ''}`}
      onClick={() => irPestana(id)}>{texto}</button>
  );

  const histJugadorSel = jugadorSel
    ? historico.find(h => h.idJugador === jugadorSel.idJugador)
    : null;

  return (
    <div className="contenedor">
      <div className="cabecera">
        <div className="cabecera-marca">
          <h1 className="marca">Pick<span>&</span>Stats</h1>
          <p className="lema">Estadísticas avanzadas · Tercera FEB</p>
        </div>
        <div className="cabecera-buscador">
          <Buscador historico={historico} equipos={equipos}
            onVerJugador={verJugador} onVerEquipo={verEquipo} />
        </div>
      </div>

      <div className="barra-temporadas">
        <span className="barra-temporadas-etiqueta">Temporada</span>
        {temporadas.map(t => (
          <button key={t}
            className={`pastilla-temporada ${t === temporada ? 'activa' : ''}`}
            onClick={() => setTemporada(t)}>
            {etiquetaTemporada(t)}
          </button>
        ))}
      </div>

      <div className="pestanas">
        {pestana('inicio', 'Inicio')}
        {pestana('resultados', 'Resultados')}
        {pestana('equipos', 'Equipos')}
        {pestana('jugadores', 'Jugadores')}
        {pestana('leyenda', 'Leyenda')}
      </div>

      {cargando ? (
        <p className="cargando">Cargando datos…</p>
      ) : legalVisible ? (
        <Legal />
      ) : partidoSel ? (
        <Partido partido={partidoSel} equipos={equipos}
          onVolver={() => setPartidoSel(null)} onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : jugadorSel ? (
        <Jugador carrera={jugadorSel} historico={histJugadorSel} equipos={equipos}
          onVolver={() => setJugadorSel(null)} onVerEquipo={verEquipo} />
      ) : equipoSel ? (
        <Equipo equipo={equipoSel} jugadores={jugadores} partidos={partidos}
          equipos={equipos} onVolver={() => setEquipoSel(null)}
          onVerEquipo={verEquipo} onVerJugador={verJugador} onVerPartido={verPartido} />
      ) : vista === 'inicio' ? (
        <Inicio equipos={equipos} jugadores={jugadores} partidos={partidos}
          temporada={temporada} onVerEquipo={verEquipo} onVerJugador={verJugador} onVerPartido={verPartido} />
      ) : vista === 'resultados' ? (
        <Resultados partidos={partidos} equipos={equipos} grupos={GRUPOS} temporada={temporada}
          onVerEquipo={verEquipo} onVerPartido={verPartido} />
      ) : vista === 'equipos' ? (
        <Equipos equipos={equipos} grupos={GRUPOS} onVerEquipo={verEquipo} />
      ) : vista === 'jugadores' ? (
        <Jugadores jugadores={jugadores} grupos={GRUPOS} equipos={equipos}
          onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : (
        <Leyenda />
      )}

      <p className="pie">
        Datos: baloncestoenvivo.feb.es · Cálculos propios · Partidos por
        sanción/incomparecencia excluidos de las métricas
        {' · '}
        <span className="enlace" onClick={abrirLegal}>Aviso legal y privacidad</span>
      </p>
    </div>
  );
}
