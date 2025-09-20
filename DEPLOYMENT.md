# Deployment Guide for Render.com

## Quick Deploy Steps

### 1. Create GitHub Repository

```bash
# Navigate to backend directory
cd F:\vercal\Suraksha-Yatra-SIH25\backend

# Initialize git repository
git init
git add .
git commit -m "Initial backend setup for Suraksha Yatra"

# Add GitHub remote (replace with your username)
git remote add origin https://github.com/YOUR_USERNAME/suraksha-backend.git
git branch -M main
git push -u origin main
```

### 2. Render.com Setup

1. **Sign up/Login to Render**: Go to [render.com](https://render.com)

2. **Create New Web Service**:
   - Click "New" → "Web Service"
   - Connect your GitHub account
   - Select the `suraksha-backend` repository
   - Configure settings:

3. **Render Configuration**:
   ```
   Name: suraksha-backend
   Region: Choose closest to your users
   Branch: main
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **Environment Variables** (Add in Render dashboard):
   ```
   PORT=4000
   JWT_SECRET=your_super_secure_jwt_secret_for_production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/suraksha
   AI_SERVICE_URL=http://localhost:5000
   NODE_ENV=production
   ```

### 3. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**: [mongodb.com/atlas](https://mongodb.com/atlas)

2. **Create Cluster**:
   - Choose free tier (M0)
   - Select region closest to your Render deployment
   - Name your cluster

3. **Database Access**:
   - Create database user
   - Save username/password for connection string

4. **Network Access**:
   - Add IP: `0.0.0.0/0` (allows all IPs - for production, restrict this)

5. **Get Connection String**:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<username>`, `<password>`, and `<database>` with your values

### 4. Production Environment Variables

```bash
# Example production .env (DON'T commit this file)
PORT=4000
JWT_SECRET=super_secure_random_string_32_chars_min
MONGODB_URI=mongodb+srv://suraksha:yourpassword@cluster0.xxxxx.mongodb.net/suraksha?retryWrites=true&w=majority
AI_SERVICE_URL=https://your-ai-service.onrender.com
NODE_ENV=production
```

### 5. Deploy Commands

```bash
# Make sure you're in the backend directory
cd F:\vercal\Suraksha-Yatra-SIH25\backend

# Stage all files
git add .

# Commit changes
git commit -m "Ready for production deployment"

# Push to GitHub (triggers Render deployment)
git push origin main
```

### 6. Verify Deployment

1. **Check Render Logs**: Monitor the deployment in Render dashboard
2. **Test Health Endpoint**: Visit `https://your-app-name.onrender.com/api/health`
3. **Test API**: Use Postman or curl to test endpoints

### 7. Common Issues & Solutions

**Build Fails**:
- Check Node.js version compatibility
- Ensure all dependencies are in `package.json`
- Check TypeScript compilation errors

**Database Connection Fails**:
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions

**Environment Variables**:
- Make sure all required variables are set in Render
- Check for typos in variable names
- Verify values are correctly formatted

**Port Issues**:
- Always use `process.env.PORT` in your code
- Don't hardcode port numbers
- Render assigns ports dynamically

### 8. Post-Deployment

1. **Update Mobile App**: Update API URL in mobile app config
2. **Test All Endpoints**: Verify all API routes work
3. **Monitor Logs**: Check for any runtime errors
4. **Set up Monitoring**: Consider adding logging service

### 9. Domain & SSL

- Render provides free SSL certificates
- Custom domains available on paid plans
- Your app will be available at: `https://your-app-name.onrender.com`

### 10. Scaling & Performance

- Free tier has limitations (sleeps after 15 min inactivity)
- Paid plans offer:
  - No sleep
  - More resources
  - Custom domains
  - Team features

---

## Quick Reference Commands

```bash
# Git setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/suraksha-backend.git
git push -u origin main

# Check deployment status
git log --oneline
git status

# Update deployment
git add .
git commit -m "Update: description of changes"
git push origin main
```

Need help? Check the [Render documentation](https://render.com/docs) or create an issue in the repository.