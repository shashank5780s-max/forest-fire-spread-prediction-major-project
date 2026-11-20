# forest-fire-spread-prediction
Deep learning-based spatio-temporal forest fire spread prediction from thermal image sequences using U-Net segmentation, ConvLSTM forecasting and a physics-informed refinement module, with a FastAPI + React dashboard.

## Deployment

### Backend on Render

1. Create a **Web Service** from this GitHub repository.
2. Use `Docker` or `Python` runtime.
3. Set the build command to:
   `pip install --upgrade pip && pip install -r backend/requirements.txt`
4. Set the start command to:
   `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
5. Set `PYTHON_VERSION=3.11.11`.
6. Set `CORS_ALLOWED_ORIGINS=https://<your-vercel-project>.vercel.app`.
7. Confirm `/health` returns `{"status":"healthy"}` and `/docs` opens successfully.

The included `render.yaml` can create the service using Render Blueprint.

### Frontend on Vercel

1. Import the GitHub repository in Vercel.
2. Set:
   - Framework preset: `Vite`
   - Root directory: `frontend`
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Set `VITE_API_BASE_URL=https://<actual-render-service>.onrender.com`.
4. Redeploy after setting the variable.

The included `vercel.json` is for repository-root configuration. When Vercel root directory is set to `frontend`, equivalent settings can be entered directly in the Vercel dashboard.

The project has no database or API-key requirement. It uses local checkpoint files and local generated output files.