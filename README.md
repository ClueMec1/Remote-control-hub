# Clicker Show — Join

The player app. People scan the QR code on the presentation screen, type their name, pick a team, and answer with big 1–5 buttons on their phone. It works together with the separate **Clicker Show — Host** app.

The interface is in English. Questions and answers written by the host appear right-to-left, for Yiddish.

## Publish on GitHub Pages

All files sit side by side in one folder (there are no subfolders), so nothing gets lost when you upload.

1. Unzip `clicker-join.zip` on your computer.
2. On GitHub, open your repository (for example `clicker-join`) → **Add file → Upload files**.
3. Open the unzipped folder, select **every file** (Ctrl+A on Windows, Cmd+A on Mac), and drag them all into the GitHub upload box. You should see about 14 files listed. Then press **Commit changes**.
4. Go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. Wait a minute, then open `https://YOUR-USERNAME.github.io/clicker-join/`.

If a file is missing, the page shows which files to upload instead of staying blank.

6. Copy that address into the Host app's dashboard, under **Join app address**.

The QR code on the host screen links to `<this address>?pin=1234`, so players land straight in the right game. Players can also open the address and type the 4-digit code themselves.

**Custom domain:** in Settings → Pages you can set a domain such as `join.yourdomain.com`. Short is better, because some people will type it.

## For players
- **Getting in:** scan the QR code, then enter your name and pick your team.
- **Answering:** buttons appear when voting opens. Your first tap counts.
- **Refreshing:** if the page reloads, you stay in the game and keep your answer.
- **Fullscreen:** on Android the address bar hides after the first tap, and you can install the app from the banner. On iPhone, use Share → **Add to Home Screen**. The installed app remembers the game code.

## Good to know
- **Where answers go:** answers go straight from each phone to the host's computer over WebRTC. No data is stored on a server.
- **Compatibility:** the Host and Join apps share `protocol.js`. If you change one copy, update both.
