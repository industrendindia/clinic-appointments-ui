# Clinic Appointments UI

Responsive React and Vite interface for the CareNest multi-clinic appointment platform.

## Development

```bash
npm install
npm run dev
```

The Vite development server proxies `/api` to `http://localhost:8080`.

## Production build

```bash
npm run build
```

The included Dockerfile builds the UI and serves it through Nginx. The production Nginx configuration expects the backend service to resolve as `api:8080`; adjust the upstream for the VPS deployment.

