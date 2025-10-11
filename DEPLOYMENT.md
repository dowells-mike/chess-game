# Chess Game - Render Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] Code is committed and pushed to GitHub
- [x] Build process works locally (`npm run build`)
- [x] All TypeScript errors resolved
- [x] `render.yaml` configuration file created
- [x] README.md updated with project information
- [x] Dependencies properly listed in package.json

## 🚀 Deployment Steps

### Step 1: Connect to Render
1. Go to [render.com](https://render.com) and sign up/log in
2. Click "New +" and select "Static Site"
3. Connect your GitHub account if not already connected
4. Select your chess-game repository

### Step 2: Configure Deployment
Use these settings in Render:

```
Name: chess-game-ai (or your preferred name)
Branch: cstlg (or main if you merge)
Root Directory: (leave empty)
Build Command: npm install && npm run build
Publish Directory: build
```

### Step 3: Advanced Settings (Optional)
- Node Version: 18 (recommended)
- Environment Variables: None needed for this project

### Step 4: Deploy
1. Click "Create Static Site"
2. Render will automatically build and deploy your app
3. The build process will take 3-5 minutes
4. Once complete, you'll get a live URL like: `https://your-app-name.onrender.com`

## 🔧 Troubleshooting

### Common Issues:

1. **Build Fails**: 
   - Check that `npm run build` works locally
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **App Shows White Screen**:
   - Usually a routing issue with single-page apps
   - The `render.yaml` includes proper rewrite rules to fix this

3. **Assets Not Loading**:
   - Ensure all assets are in the `public` folder
   - Check that build process includes all necessary files

### Build Commands Explained:
- `npm install`: Installs all dependencies
- `npm run build`: Creates optimized production build
- `build` folder: Contains the static files to serve

## 📱 Testing After Deployment

1. **Basic Functionality**:
   - Game loads properly
   - Pieces can be moved
   - UI is responsive on mobile

2. **AI Features**:
   - New Game modal works
   - AI opponent makes moves
   - Difficulty levels function properly

3. **Game Features**:
   - Undo/Redo works
   - Time controls function
   - PGN export works
   - Sound effects play (if enabled)

## 🌐 Custom Domain (Optional)

If you want a custom domain:
1. Go to your Render dashboard
2. Select your deployed site
3. Click "Settings" → "Custom Domains"
4. Add your domain and follow DNS instructions

## 🔄 Future Updates

To deploy updates:
1. Make changes locally
2. Test with `npm run build`
3. Commit and push to GitHub
4. Render will automatically redeploy

## 📊 Performance Notes

- First load might be slow (cold start)
- Subsequent loads will be fast
- Consider upgrading to paid plan for better performance
- Assets are automatically cached by Render's CDN

## 🆘 Support

If deployment fails:
1. Check Render's build logs
2. Verify the build works locally
3. Check this checklist for missed steps
4. Review common issues above
