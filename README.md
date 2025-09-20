# Suraksha Yatra Backend API

A Node.js/Express backend service for the Suraksha Yatra safety application, providing authentication, emergency services, location tracking, and AI integration.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Emergency Services**: CRUD operations for emergency contacts and services
- **Location Tracking**: Real-time location updates and safe zone management
- **AI Integration**: Pattern analysis and risk prediction
- **Real-time Communication**: Socket.io for live updates
- **MongoDB Integration**: Mongoose ODM with data validation

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/suraksha-backend.git
   cd suraksha-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```bash
   PORT=4000
   JWT_SECRET=your_super_secret_jwt_key_here
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   AI_SERVICE_URL=http://localhost:5000
   ```

## 🚀 Development

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
npm start
```

**Run tests:**
```bash
npm test
npm run test:coverage
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Emergency Services
- `GET /api/emergency-services` - Get emergency services
- `POST /api/emergency-services` - Create emergency service (admin)
- `PUT /api/emergency-services/:id` - Update service (admin)
- `DELETE /api/emergency-services/:id` - Delete service (admin)

### Location & Safety
- `POST /api/location/update` - Update user location
- `GET /api/safe-zones` - Get user's safe zones
- `POST /api/safe-zones` - Create safe zone

### Panic Alerts
- `POST /api/panic` - Trigger panic alert
- `GET /api/panic/history` - Get panic history

## 🌍 Deployment

### Render.com Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect your GitHub repo
   - Use these settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node.js

3. **Environment Variables on Render**
   ```
   PORT=4000
   JWT_SECRET=your_production_jwt_secret_here
   MONGODB_URI=your_mongodb_atlas_connection_string
   AI_SERVICE_URL=your_ai_service_url
   NODE_ENV=production
   ```

### Environment Variables Guide

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `JWT_SECRET` | JWT signing secret | `super_secret_key_2024` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.net/db` |
| `AI_SERVICE_URL` | AI service endpoint | `https://your-ai-service.com` |
| `NODE_ENV` | Environment mode | `production` |

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT token validation
- Password hashing with bcrypt
- Input validation with Zod

## 📊 Monitoring

- Health check endpoint: `GET /api/health`
- Structured logging
- Error handling middleware

## 🧪 Testing

- Jest test framework
- Supertest for API testing
- MongoDB Memory Server for test database
- Coverage reports

## 📝 API Documentation

Full API documentation available at `/api/docs` when running in development mode.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Smart India Hackathon 2025

This backend is part of the Suraksha Yatra project for Smart India Hackathon 2025.

---

**Made with ❤️ for safer travels**