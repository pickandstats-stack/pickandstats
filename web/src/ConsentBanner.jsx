import { useEffect, useState } from 'react';

const CLAVE = 'pas-consent'; // 'granted' | 'denied'

export default function ConsentBanner({ onAbrirLegal }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let previa = null;
    try { previa = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }
    if (previa === 'granted') actualizar('granted');
    else if (previa === 'denied') actualizar('denied');
    else setVisible(true);
  }, []);

  const actualizar = estado => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: estado,
        ad_storage: estado,
        ad_user_data: estado,
        ad_personalization: estado
      });
    }
  };

  const decidir = estado => {
    try { localStorage.setItem(CLAVE, estado); } catch { /* ignora */ }
    actualizar(estado);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="consent-banner">
      <div className="consent-texto">
        Usamos cookies de analítica (Google Analytics) para entender cómo se usa la web y
        mejorarla. No se activan hasta que las aceptes. Puedes rechazarlas y seguir navegando
        con normalidad. Más información en el{' '}
        <a href="#" onClick={e => { e.preventDefault(); onAbrirLegal && onAbrirLegal(); }}>
          aviso legal y privacidad
        </a>.
      </div>
      <div className="consent-botones">
        <button className="consent-btn consent-rechazar" onClick={() => decidir('denied')}>
          Rechazar
        </button>
        <button className="consent-btn consent-aceptar" onClick={() => decidir('granted')}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
