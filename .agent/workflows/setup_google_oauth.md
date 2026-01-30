---
description: How to set up Google OAuth for Supabase
---

# Google OAuth Configuration Guide

Follow these steps to generate the **Client ID** and **Client Secret** needed to enable "Continue with Google".

## 1. Create a Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **"New Project"**.
3. Name it `Hostel Hustle` (or your app name) and click **Create**.
4. Once created, select the project from the notification bell or dropdown.

## 2. Configure Consent Screen
1. In the left sidebar, go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** (unless you are a Google Workspace org) and click **Create**.
3. **App Information**:
   - **App Name**: Hostel Hustle
   - **User Support Email**: Select your email.
4. **Developer Contact Information**: Enter your email again.
5. Click **Save and Continue** (you can skip Scopes and Test Users for now by clicking Save/Continue).
6. On the Summary page, click **Back to Dashboard**.

## 3. Create Credentials
1. In the left sidebar, click **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3. **Application Type**: Select **Web application**.
4. **Name**: `Supabase Auth`.
5. **Authorized JavaScript Origins**:
   - Add: `https://tvmlgdgdpbntyehpinps.supabase.co`
   - *Note: This is your Supabase Project URL found in your screenshot.*
6. **Authorized Redirect URIs** (CRITICAL):
   - Add: `https://tvmlgdgdpbntyehpinps.supabase.co/auth/v1/callback`
   - *This ensures Google sends the user back to Supabase safely.*
7. Click **Create**.

## 4. Copy Keys to Supabase
1. A popup will appear with your **Client ID** and **Client Secret**.
2. Copy them.
3. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/tvmlgdgdpbntyehpinps/auth/providers).
4. Navigate to **Authentication** > **Providers** > **Google**.
5. Enable it.
6. Paste the **Client ID** and **Client Secret**.
7. Click **Save**.

## 5. Enable Localhost (Optional for Testing)
If you want it to work on `localhost:8080`, enable it in **Google Cloud Console** under "Authorized JavaScript Origins" add:
- `http://localhost:8080`
- `http://172.30.2.89:8080` (Your local IP from screenshot)

And under "Authorized Redirect URIs":
- `http://localhost:8080` (Optional, usually only the Supabase one is strictly needed for the callback flow, but good for safety).

**Done!** Your button will now work.
