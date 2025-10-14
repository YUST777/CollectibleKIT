# Netlify Deployment Guide

## Prerequisites
- Netlify account
- GitHub repository connected to Netlify

## Deployment Steps

### 1. Push Clean Code to GitHub
The repository is now configured to exclude:
- Study projects (`study me/` folder)
- Bot files and databases
- Temporary uploads
- Python scripts

### 2. Netlify Configuration
The project includes a `netlify.toml` file with:
- Base directory: `webapp-nextjs`
- Build command: `npm run build`
- Next.js plugin enabled

### 3. Environment Variables
Set these in Netlify dashboard (if needed):
- `DATABASE_PATH` - Path to database (configure for Netlify)
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `NEXT_PUBLIC_APP_URL` - Your Netlify app URL

### 4. Build Settings in Netlify Dashboard
- Base directory: `webapp-nextjs`
- Build command: `npm run build`
- Publish directory: `webapp-nextjs/.next`
- Node version: 18

### 5. Deploy
1. Connect your GitHub repository to Netlify
2. Configure the build settings as above
3. Add environment variables
4. Trigger deployment

## Important Notes

### Database Consideration
The current setup uses SQLite which may not work well on Netlify's serverless environment. Consider:
- Using Netlify's serverless functions with external database (PostgreSQL, MongoDB)
- Or using a service like PlanetScale, Supabase, or Neon

### File Uploads
The `temp_uploads/` directory won't persist on Netlify. Consider using:
- Netlify Blobs
- AWS S3
- Cloudinary
- Or another cloud storage service

## Troubleshooting

### Build Fails
- Check Node version is set to 18
- Ensure all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### Functions Don't Work
- Verify API routes are using supported Next.js patterns
- Check serverless function logs in Netlify

### Images Don't Load
- Update `next.config.js` domains to include your Netlify URL
- Check image paths are correct

## Local Development
```bash
cd webapp-nextjs
npm install
npm run dev
```

The app will run on http://localhost:3003

