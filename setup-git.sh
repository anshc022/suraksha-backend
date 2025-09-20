#!/bin/bash

# Suraksha Backend - Git Setup Script
# Run this script to initialize the repository and push to GitHub

echo "🚀 Setting up Suraksha Backend Repository..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Get GitHub username
read -p "Enter your GitHub username: " github_username

if [ -z "$github_username" ]; then
    echo "❌ Error: GitHub username is required."
    exit 1
fi

echo "📁 Initializing git repository..."
git init

echo "📝 Adding all files..."
git add .

echo "💾 Creating initial commit..."
git commit -m "Initial commit: Suraksha Yatra Backend API

- Node.js/Express backend with TypeScript
- JWT authentication system
- MongoDB integration with Mongoose
- Emergency services API
- Location tracking and safe zones
- Panic alert system
- Socket.io for real-time communication
- Comprehensive test suite
- Ready for Render.com deployment

Smart India Hackathon 2025"

echo "🌐 Adding GitHub remote..."
git remote add origin "https://github.com/$github_username/suraksha-backend.git"

echo "🔄 Setting main branch..."
git branch -M main

echo "📤 Pushing to GitHub..."
echo "⚠️  Make sure you've created the 'suraksha-backend' repository on GitHub first!"
read -p "Press Enter when you've created the repository on GitHub..."

git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Success! Repository pushed to GitHub."
    echo ""
    echo "🌟 Next Steps:"
    echo "1. Go to https://render.com"
    echo "2. Create a new Web Service"
    echo "3. Connect to your GitHub repo: $github_username/suraksha-backend"
    echo "4. Use these settings:"
    echo "   - Build Command: npm install && npm run build"
    echo "   - Start Command: npm start"
    echo "   - Environment: Node.js"
    echo ""
    echo "5. Add environment variables in Render dashboard:"
    echo "   - PORT=4000"
    echo "   - JWT_SECRET=your_secure_secret"
    echo "   - MONGODB_URI=your_mongodb_connection_string"
    echo "   - NODE_ENV=production"
    echo ""
    echo "📚 For detailed instructions, see DEPLOYMENT.md"
else
    echo "❌ Failed to push to GitHub. Please check your credentials and try again."
    echo "You can manually push with: git push -u origin main"
fi