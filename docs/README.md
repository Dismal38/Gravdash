# Hosting your Privacy Policy on GitHub Pages (Free)

Google Play requires a publicly accessible Privacy Policy URL for every app
listing. You can host the included `privacy-policy.html` for free using
GitHub Pages — no server, no domain purchase, no monthly cost.

## Steps

1. Push this repository to GitHub (use the **"Save to GitHub"** button in the
   Emergent chat input).
2. On GitHub, open your repository → **Settings** → **Pages** (left sidebar).
3. Under **"Build and deployment"**:
   - **Source**: *Deploy from a branch*
   - **Branch**: `main` (or whichever branch you pushed)
   - **Folder**: `/docs`
   - Click **Save**.
4. Wait ~1 minute. GitHub will show a green banner with your public URL,
   something like:

   ```
   https://<your-github-username>.github.io/<your-repo-name>/privacy-policy.html
   ```

5. Before publishing, open `privacy-policy.html` and replace
   `REPLACE_WITH_YOUR_EMAIL@example.com` with a real contact email
   (a free Gmail address is fine).
6. Paste the public URL into the **Privacy Policy** field in the Google Play
   Console → *App content* → *Privacy Policy*.

That's it — completely free, and the page updates automatically every time
you push changes to the `docs/` folder.
