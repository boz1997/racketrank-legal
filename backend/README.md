# RacketRank Backend API

Backend API server for RacketRank Rankings page. Keeps Supabase credentials secure on the server.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   PORT=3000
   ```

3. Get your Supabase credentials:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to **Settings** > **API**
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **service_role** key (NOT anon key!) → `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ **WARNING**: Service role key has admin access. Never expose it to frontend!

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on `http://localhost:3000`

## 📡 API Endpoints

### Health Check
```
GET /api/health
```
Returns: `{ status: 'ok', message: 'RacketRank API is running' }`

### Get Rankings
```
GET /api/rankings?level=district&district=Bodrum&city=Mugla&country=Turkey
```

**Query Parameters:**
- `level` (required): `district` | `city` | `country`
- `district` (optional): District name
- `city` (optional): City name
- `country` (optional): Country name

**Response:**
```json
{
  "success": true,
  "level": "district",
  "count": 25,
  "data": [
    {
      "Oid": "uuid-here",
      "first_name": "John",
      "last_name": "Doe",
      "rating": 1500,
      "district": "Bodrum",
      "city": "Mugla",
      "country": "Turkey"
    }
  ]
}
```

## 🔒 Security

- ✅ Supabase credentials stay on the server
- ✅ Service role key never exposed to frontend
- ✅ CORS enabled for frontend access
- ✅ Input validation on all endpoints

## 🌐 Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd backend
   vercel
   ```

3. Set environment variables in Vercel dashboard

### Option 2: Railway

1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Option 3: Heroku

1. Install Heroku CLI
2. Create app:
   ```bash
   heroku create your-app-name
   ```
3. Set environment variables:
   ```bash
   heroku config:set SUPABASE_URL=your-url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-key
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

### Option 4: DigitalOcean / AWS / Any VPS

1. Clone repo on server
2. Install Node.js and npm
3. Run `npm install`
4. Set up `.env` file
5. Use PM2 or similar to keep server running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name racketrank-api
   ```

## 🔧 Update Frontend

After deploying backend, update frontend `rankings.html`:

```javascript
window.API_BASE_URL = 'https://your-backend-url.com';
```

Or set it dynamically based on environment.

## 📝 Notes

- The backend uses Supabase **service_role** key, which has admin access
- This is safe because it's only on the server, never exposed to clients
- Frontend only calls the backend API, never directly accesses Supabase
- All database queries are handled securely on the backend

