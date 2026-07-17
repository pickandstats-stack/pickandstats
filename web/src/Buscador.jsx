import { useMemo, useState, useRef, useEffect } from 'react';

// normaliza: minúsculas y sin acentos, para buscar sin tildes
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function Buscador({ historico, equipos, onVerJugador, onVerEquipo }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const cont = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const fuera = e => { if (cont.current && !cont.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const resultados = useMemo(() => {
    const term = norm(q).trim();
    if (term.length < 2) return { jugadores: [], equipos: [] };

    const jug = (historico || [])
      .filter(h => norm(h.nombre).includes(term))
      .slice(0, 8)
      .map(h => ({
        id: h.idJugador,
        nombre: h.nombre,
        temps: Object.keys(h.temporadas || {}).sort()
      }));

    // equipos: únicos por nombre dentro de la temporada activa
    const vistos = new Set();
    const eq = (equipos || [])
      .filter(e => norm(e.nombre).includes(term))
      .filter(e => { if (vistos.has(e.nombre)) return false; vistos.add(e.nombre); return true; })
      .slice(0, 5);

    return { jugadores: jug, equipos: eq };
  }, [q, historico, equipos]);

  const hayResultados = resultados.jugadores.length > 0 || resultados.equipos.length > 0;

  const etiquetaTemp = t => `${t}/${(+t + 1).toString().slice(2)}`;

  const clicJugador = id => { setAbierto(false); setQ(''); onVerJugador(id); };
  const clicEquipo = e => { setAbierto(false); setQ(''); onVerEquipo(e); };

  return (
    <div className="buscador" ref={cont}>
      <input
        type="search"
        placeholder="Buscar jugador o equipo…"
        value={q}
        onChange={e => { setQ(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
      />
      {abierto && q.trim().length >= 2 && (
        <div className="buscador-resultados">
          {!hayResultados && <div className="buscador-vacio">Sin coincidencias</div>}

          {resultados.jugadores.length > 0 && (
            <>
              <div className="buscador-grupo-titulo">Jugadores</div>
              {resultados.jugadores.map(j => (
                <div key={j.id} className="buscador-item" onClick={() => clicJugador(j.id)}>
                  <span className="buscador-nombre">{j.nombre}</span>
                  <span className="buscador-meta">
                    {j.temps.map(etiquetaTemp).join(' · ')}
                  </span>
                </div>
              ))}
            </>
          )}

          {resultados.equipos.length > 0 && (
            <>
              <div className="buscador-grupo-titulo">Equipos (temporada actual)</div>
              {resultados.equipos.map(e => (
                <div key={e.id} className="buscador-item" onClick={() => clicEquipo(e)}>
                  <span className="buscador-nombre">{e.nombre}</span>
                  <span className="buscador-meta">{e.grupo}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
