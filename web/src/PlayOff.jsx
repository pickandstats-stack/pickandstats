import { useMemo } from 'react';

// Normaliza un par de equipos a una clave única (sin importar quién es local)
const clavePar = (a, b) => [a, b].sort().join(' ||| ');

// Detecta la ronda a partir del nombre de la fase
function tipoRonda(nombre) {
  if (/1\/8/.test(nombre)) return { orden: 1, titulo: 'Octavos de final' };
  if (/1\/4/.test(nombre)) return { orden: 2, titulo: 'Cuartos de final' };
  if (/1\/2/.test(nombre)) return { orden: 3, titulo: 'Semifinales' };
  if (/permanencia/i.test(nombre)) return { orden: 5, titulo: 'Permanencia' };
  if (/final/i.test(nombre)) return { orden: 4, titulo: 'Final' };
  return { orden: 9, titulo: nombre };
}

export default function PlayOff({ fases, onVerEquipoNombre, onVerPartido }) {
  const rondas = useMemo(() => {
    return fases.map(f => {
      const info = tipoRonda(f.fase);
      const series = {};
      for (const p of f.partidos) {
        const k = clavePar(p.local, p.visitante);
        if (!series[k]) series[k] = { equipos: new Set(), partidos: [], vict: {} };
        series[k].equipos.add(p.local);
        series[k].equipos.add(p.visitante);
        series[k].partidos.push(p);
        if (p.resultado) {
          const [gl, gv] = p.resultado.split('-').map(Number);
          const ganador = gl > gv ? p.local : p.visitante;
          series[k].vict[ganador] = (series[k].vict[ganador] || 0) + 1;
        }
      }
      const listaSeries = Object.values(series).map(s => {
        const eqs = [...s.equipos];
        const aFecha = str => {
          const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{4})/);
          return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0);
        };
        s.partidos.sort((a, b) => aFecha(a.fecha) - aFecha(b.fecha));
        const esSerie = s.partidos.length > 1;
        let ganador = null;
        if (eqs.length === 2) {
          const [v0, v1] = [s.vict[eqs[0]] || 0, s.vict[eqs[1]] || 0];
          if (v0 !== v1) ganador = v0 > v1 ? eqs[0] : eqs[1];
        }
        return { equipos: eqs, partidos: s.partidos, vict: s.vict, esSerie, ganador };
      });
      return { ...info, fase: f.fase, series: listaSeries };
    }).sort((a, b) => a.orden - b.orden);
  }, [fases]);

  const nombreClic = nombre => (
    <span className="enlace" onClick={() => onVerEquipoNombre(nombre)}>{nombre}</span>
  );

  // Adapta un partido de fases.json a la forma que espera Partido.jsx y abre su ficha
  const abrirPartido = (p, titulo) => {
    if (!p.boxscore) return;
    onVerPartido({
      ...p,
      grupo: 'Play-offs',
      jornada: titulo,
      local: { id: null, nombre: p.local },
      visitante: { id: null, nombre: p.visitante },
      cuartos: p.cuartos || []
    });
  };

  return (
    <div className="playoff">
      {rondas.map(r => (
        <div className="playoff-ronda" key={r.fase}>
          <h3 className="seccion">{r.titulo}</h3>
          <div className="playoff-series">
            {r.series.map((s, i) => (
              <div className="playoff-serie" key={i}>
                {s.esSerie ? (
                  <>
                    <div className="serie-cabecera">
                      <span className={`serie-equipo ${s.ganador === s.equipos[0] ? 'gana' : ''}`}>
                        {nombreClic(s.equipos[0])}
                      </span>
                      <span className="serie-marcador">
                        {s.vict[s.equipos[0]] || 0}–{s.vict[s.equipos[1]] || 0}
                      </span>
                      <span className={`serie-equipo ${s.ganador === s.equipos[1] ? 'gana' : ''}`}>
                        {nombreClic(s.equipos[1])}
                      </span>
                    </div>
                    <div className="serie-partidos">
                      {s.partidos.map(p => {
                        const [gl, gv] = (p.resultado || '').split('-').map(Number);
                        const jugado = !isNaN(gl) && !isNaN(gv);
                        return (
                          <div className="serie-partido enlace-card" key={p.id}
                            onClick={() => jugado && abrirPartido(p, r.titulo)}>
                            <span className="serie-fecha">{p.fecha}</span>
                            <span className={jugado && gl > gv ? 'gana' : ''}>{p.local}</span>
                            <span className="resultado-marca">{jugado ? `${gl}–${gv}` : 'vs'}</span>
                            <span className={jugado && gv > gl ? 'gana' : ''}>{p.visitante}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  s.partidos.map(p => {
                    const [gl, gv] = (p.resultado || '').split('-').map(Number);
                    const jugado = !isNaN(gl) && !isNaN(gv);
                    return (
                      <div className="playoff-unico enlace-card" key={p.id}
                        onClick={() => jugado && abrirPartido(p, r.titulo)}>
                        <span className="serie-fecha">{p.fecha}</span>
                        <div className={`serie-equipo ${jugado && gl > gv ? 'gana' : ''}`}>
                          {nombreClic(p.local)}
                        </div>
                        <span className="serie-marcador">{jugado ? `${gl}–${gv}` : 'vs'}</span>
                        <div className={`serie-equipo ${jugado && gv > gl ? 'gana' : ''}`}>
                          {nombreClic(p.visitante)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
