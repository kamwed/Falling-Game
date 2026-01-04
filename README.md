# Sky Fall Payments Backend

Minimal Node.js/Express backend for handling Stripe payments for the Sky Fall game.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run locally:
```bash
npm start
```

3. Test health check:
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

## Deployment on Render

1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment: Node

The service will automatically start on the port provided by Render via `process.env.PORT`.

## Endpoints

- `GET /health` - Health check endpoint
