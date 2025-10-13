# Heroku Deployment Guide

This guide explains how to deploy the jedana.fi Next.js application to Heroku.

## Prerequisites

1. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
2. A Heroku account
3. Git repository configured (already done)

## Deployment Steps

### 1. Create a new Heroku app

```bash
heroku create your-app-name
```

Or if you want Heroku to generate a name:

```bash
heroku create
```

### 2. Set environment variables

You need to configure the following environment variables on Heroku:

```bash
# Supabase configuration
heroku config:set NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI API key
heroku config:set OPENAI_API_KEY=your-openai-api-key
```

### 3. Add Node.js buildpack (if not already added)

```bash
heroku buildpacks:set heroku/nodejs
```

### 4. Deploy to Heroku

```bash
git push heroku master
```

Or if you're on a different branch:

```bash
git push heroku your-branch:master
```

### 5. Open your app

```bash
heroku open
```

## Important Notes

1. **Port Configuration**: The app is configured to use Heroku's PORT environment variable automatically through the `npm start` script.

2. **Image Optimization**: Next.js image optimization is disabled in production because Heroku doesn't support it by default. Images will be served as-is.

3. **Build Process**: The `heroku-postbuild` script in package.json ensures that Next.js builds the production bundle during deployment.

4. **Environment Variables**: Make sure all required environment variables are set before deploying. You can verify them with:
   ```bash
   heroku config
   ```

## Monitoring and Logs

To view application logs:

```bash
heroku logs --tail
```

To check application status:

```bash
heroku ps
```

## Troubleshooting

### Build Failures

If the build fails, check:
1. All dependencies are listed in package.json
2. Environment variables are correctly set
3. No TypeScript errors (run `npm run build` locally first)

### Runtime Errors

1. Check logs with `heroku logs --tail`
2. Ensure all environment variables are set
3. Verify database connections (Supabase) are working

### Memory Issues

If you encounter memory issues, you might need to upgrade your Heroku dyno type or optimize your application's memory usage.
