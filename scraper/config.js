// Configuración del scraper
module.exports = {
  BASE: 'https://baloncestoenvivo.feb.es',
  // Competición por defecto; se puede sobrescribir con --competicion <id>
  COMPETICION: { id: 3, nombre: 'tercerafeb' },
  // Mapa de competiciones FEB (parámetro g de la web)
  COMPETICIONES: {
    1: 'primerafeb',
    2: 'segundafeb',
    3: 'tercerafeb'
  },
  TEMPORADA_DEFECTO: '2025',
  FILTRO_GRUPOS: /liga regular/i,
  PAUSA_MS: 1200,
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
};
