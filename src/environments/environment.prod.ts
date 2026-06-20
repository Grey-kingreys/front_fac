export const environment = {
    production: true,
    // URL relative : le front est servi par le même domaine que l'API (same-origin),
    // donc plus aucun CORS. Caddy route /api vers Django.
    apiUrl: '/api',
    swaggerUrl: '/api/schema/swagger-ui/'
};
