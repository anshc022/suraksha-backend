@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up Suraksha Backend Repository...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the backend directory.
    pause
    exit /b 1
)

REM Get GitHub username
set /p github_username="Enter your GitHub username: "

if "!github_username!"=="" (
    echo ❌ Error: GitHub username is required.
    pause
    exit /b 1
)

echo 📁 Initializing git repository...
git init

echo 📝 Adding all files...
git add .

echo 💾 Creating initial commit...
git commit -m "Initial commit: Suraksha Yatra Backend API - Node.js/Express backend with TypeScript - JWT authentication system - MongoDB integration with Mongoose - Emergency services API - Location tracking and safe zones - Panic alert system - Socket.io for real-time communication - Comprehensive test suite - Ready for Render.com deployment - Smart India Hackathon 2025"

echo 🌐 Adding GitHub remote...
git remote add origin "https://github.com/!github_username!/suraksha-backend.git"

echo 🔄 Setting main branch...
git branch -M main

echo 📤 Pushing to GitHub...
echo ⚠️  Make sure you've created the 'suraksha-backend' repository on GitHub first!
pause

git push -u origin main

if !errorlevel! equ 0 (
    echo ✅ Success! Repository pushed to GitHub.
    echo.
    echo 🌟 Next Steps:
    echo 1. Go to https://render.com
    echo 2. Create a new Web Service
    echo 3. Connect to your GitHub repo: !github_username!/suraksha-backend
    echo 4. Use these settings:
    echo    - Build Command: npm install ^&^& npm run build
    echo    - Start Command: npm start
    echo    - Environment: Node.js
    echo.
    echo 5. Add environment variables in Render dashboard:
    echo    - PORT=4000
    echo    - JWT_SECRET=your_secure_secret
    echo    - MONGODB_URI=your_mongodb_connection_string
    echo    - NODE_ENV=production
    echo.
    echo 📚 For detailed instructions, see DEPLOYMENT.md
) else (
    echo ❌ Failed to push to GitHub. Please check your credentials and try again.
    echo You can manually push with: git push -u origin main
)

pause