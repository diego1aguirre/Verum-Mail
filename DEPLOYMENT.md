# Deploying Verum Mail

The app has two parts:

1. **Frontend** (React + Vite) – the form users see
2. **Backend** (Node + Express) – sends email and calendar invites; must run on a server with your env vars

Deploy them separately, then connect them with environment variables.

---

## 1. Deploy the backend (Node server)

Host the **whole project** (or at least `server.js` + `package.json` + `node_modules` from install) on a service that runs Node.js. Do **not** commit `.env`; set the same values in the host’s environment.

### Option A: Render (free tier)

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → New → Web Service.
3. Connect the repo, set:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Root directory:** (leave blank if repo root has `server.js`)
4. In **Environment**, add:
   - `EMAIL_USER` = your Gmail (e.g. `comite.verum@gmail.com`)
   - `EMAIL_PASS` = Gmail app password
   - `FRONTEND_URL` = your frontend URL (e.g. `https://verum-mail.vercel.app`)
5. Deploy. Note the backend URL, e.g. `https://verum-mail-api.onrender.com`.

### Option B: Railway

1. Push to GitHub, go to [railway.app](https://railway.app).
2. New Project → Deploy from GitHub → select repo.
3. In **Variables**, add `EMAIL_USER`, `EMAIL_PASS`, `FRONTEND_URL`.
4. Set **Start command:** `node server.js`. Deploy and copy the public URL.

### Option C: Fly.io / Heroku / VPS

- Same idea: run `node server.js`, set `PORT` (if required), `EMAIL_USER`, `EMAIL_PASS`, and `FRONTEND_URL` in the environment.

---

## 2. Deploy the frontend (Vite)

Build the React app and host the **build output** as a static site. The build must know the backend URL.

### Option A: Vercel

1. Push to GitHub. Go to [vercel.com](https://vercel.com) → Import your repo.
2. **Framework:** Vite (auto-detected). **Root directory:** project root.
3. In **Environment Variables**, add:
   - **Name:** `VITE_API_URL`  
   - **Value:** your backend URL (e.g. `https://verum-mail-api.onrender.com`)  
   - No `https://` typo; no trailing slash.
4. Deploy. Vercel gives you a URL like `https://verum-mail.vercel.app`.

### Option B: Netlify

1. Import from GitHub. Build command: `npm run build`. Publish directory: `dist`.
2. In **Site settings → Environment variables**, add:
   - `VITE_API_URL` = your backend URL (e.g. `https://verum-mail-api.onrender.com`)
3. Redeploy so the build picks up the variable.

### Option C: Static host (GitHub Pages, etc.)

- Run `VITE_API_URL=https://your-backend-url.com npm run build`, then upload the `dist` folder. The backend URL is baked into the build.

---

## 3. Connect frontend and backend

1. **Backend:** Set `FRONTEND_URL` to the **exact** frontend URL (e.g. `https://verum-mail.vercel.app`). No trailing slash. This is used for CORS.
2. **Frontend:** Set `VITE_API_URL` to the **exact** backend URL (e.g. `https://verum-mail-api.onrender.com`). No trailing slash. Then rebuild/redeploy the frontend.

After that, the deployed site will call your deployed API and emails will work the same as locally.

---

## Checklist

| Where        | Variable        | Example                          |
|-------------|-----------------|----------------------------------|
| Backend env | `EMAIL_USER`    | `comite.verum@gmail.com`         |
| Backend env | `EMAIL_PASS`    | Gmail app password               |
| Backend env | `FRONTEND_URL`  | `https://verum-mail.vercel.app`  |
| Frontend env| `VITE_API_URL`  | `https://verum-mail-api.onrender.com` |

Never commit `.env` or put real passwords in the repo. Use each platform’s “Environment variables” or “Secrets” for production.
