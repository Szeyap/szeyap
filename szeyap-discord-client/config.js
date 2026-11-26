// This file is used to store configuration data for the application.
// This can include things like API keys, configuration settings, and more.
require('dotenv').config();

// API base URL (without the trailing `/api`).
// Override with API_BASE_URL. The default is the live backend from the
// schan27/szeyap fork — the original szeyap-api-production.up.railway.app
// deployment is dead (404), so it must not be used as the default.
const API_BASE_URL = (process.env.API_BASE_URL || (process.env.NODE_ENV === 'DEVELOPMENT' ? 'http://szeyap-api:8000' : 'https://szeyap-backend-production.up.railway.app')).replace(/\/$/, '');
const API_ENDPOINT = `${API_BASE_URL}/api`;
const RESULTS_PER_PAGE = 5;

const ROMANIZATION_SYSTEMS = {
  "HSR": "Hoisan Sauce",
  "SL": "Stephen Li",
  "GC": "Gene Chin",
  "DJ": "Deng Jun",
  "JW": "Jade Wu"
}

module.exports = {
  API_BASE_URL,
  API_ENDPOINT,
  RESULTS_PER_PAGE,
  ROMANIZATION_SYSTEMS
}
