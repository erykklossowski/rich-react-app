# Deployment Guide for Render

## 🚀 Render Deployment Commands

### Backend API Service
- **Build Command**: `npm install --legacy-peer-deps`
- **Start Command**: `npm run server`
- **Environment**: Node.js
- **Port**: 10000 (set via env var)

### Frontend Static Site
- **Build Command**: `npm install --legacy-peer-deps && npm run build`
- **Publish Path**: `./dist`
- **Environment**: Static Site

## 📋 Required Environment Variables

### Backend API Service
```bash
NODE_ENV=production
PORT=10000
GEMINI_API_KEY=your_gemini_api_key_here  # Optional
```

### Frontend Static Site
```bash
VITE_API_URL=https://rich-react-app-api.onrender.com
```

## 🔧 Build Process

1. **Backend Build**:
   - Installs dependencies with legacy peer deps
   - No build step needed (Node.js runtime)

2. **Frontend Build**:
   - Installs dependencies with legacy peer deps
   - Runs `npm run build` to create production bundle
   - Outputs to `./dist` directory

## 🌐 Service URLs

- **Backend API**: `https://rich-react-app-api.onrender.com`
- **Frontend**: `https://rich-react-app-frontend.onrender.com`

## 🔄 Development vs Production

### Development
- Frontend: `http://localhost:3002`
- Backend: `http://localhost:3000`
- CORS: All origins allowed

### Production
- Frontend: `https://rich-react-app-frontend.onrender.com`
- Backend: `https://rich-react-app-api.onrender.com`
- CORS: Restricted to frontend domain

## 📝 Deployment Checklist

- [ ] Update `render.yaml` with correct service names
- [ ] Set environment variables in Render dashboard
- [ ] Ensure `package.json` has correct scripts
- [ ] Test build locally with `npm run build`
- [ ] Verify API endpoints work with mock data
- [ ] Check CORS configuration for production

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails**: Check for missing dependencies in `package.json`
2. **CORS Errors**: Verify CORS configuration in `server.js`
3. **API Not Found**: Ensure `VITE_API_URL` is set correctly
4. **Port Issues**: Check `PORT` environment variable

### Local Testing

```bash
# Test backend only
npm run server

# Test frontend only
npm run dev

# Test full stack
npm run dev:full
```

## 📊 Performance Optimization

- Backend uses mock data for faster response
- Frontend is statically built for optimal loading
- API responses are cached by browser
- No database dependencies for faster startup 