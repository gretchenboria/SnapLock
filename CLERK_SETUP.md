# Setting Up Authentication with Clerk

SnapLock uses [Clerk](https://clerk.com) for OAuth authentication, allowing users to sign in with GitHub, Google, Microsoft, and other trusted providers.

## Why Clerk?

- **Free tier**: Generous limits for personal projects
- **Multiple OAuth providers**: GitHub, Google, Microsoft, Discord, and more
- **Beautiful UI**: Pre-built sign-in components
- **Security**: Industry-standard authentication
- **Easy integration**: Just a few environment variables

## Setup Instructions

### 1. Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application

### 2. Configure OAuth Providers

In your Clerk dashboard:

1. Go to **"Configure" → "Authentication"**
2. Enable the OAuth providers you want:
   - ✅ GitHub
   - ✅ Google
   - ✅ Microsoft
   - ✅ Discord
   - ✅ And many more...

3. Follow Clerk's guides to configure each provider (usually just clicking "Enable")

### 3. Get Your Publishable Key

1. Go to **"API Keys"** in your Clerk dashboard
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Add it to your `.env` file:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 4. Restart Your Dev Server

```bash
npm run dev
```

## Testing Authentication

1. Open SnapLock in your browser
2. Go to the **SETTINGS** tab in the left panel
3. Under **ACCOUNT**, click **SIGN IN**
4. Choose your OAuth provider (GitHub, Google, etc.)
5. Complete the OAuth flow

That's it! Your users can now sign in with trusted OAuth providers.

## Benefits of Authentication

- **Sync settings across devices**: Settings persist across browsers and devices
- **Secure**: Industry-standard OAuth 2.0
- **No passwords**: Users sign in with accounts they already trust
- **Profile data**: Automatically populate username, email, and profile picture

## Optional: Without Clerk

SnapLock works perfectly without authentication. User profiles and settings will be stored locally in the browser's localStorage. Simply don't add the `VITE_CLERK_PUBLISHABLE_KEY` and the app will work in local-only mode.

## Troubleshooting

**"Sign In" button does nothing**
- Check that `VITE_CLERK_PUBLISHABLE_KEY` is set in your `.env`
- Restart your dev server after adding the key
- Check browser console for errors

**OAuth provider not showing up**
- Make sure you enabled it in your Clerk dashboard
- Some providers require additional configuration (see Clerk docs)

**Works locally but not in production**
- Use your production Clerk key (`pk_live_`) in production
- Add your production domain to Clerk's allowed domains

## Cost

Clerk's free tier includes:
- 10,000 monthly active users
- All OAuth providers
- Unlimited sign-ins
- Email support

More than enough for most projects!
