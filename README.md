# ASM Meeting Desk (Anwar Cement Sheet)

One file: `index.html`. No build step.

## What it does
- ASMs see only **Book a time**: pick area, start (days 1-9) or end (days 25-30) of month, then a free time. First to tap gets it. Fridays off.
- Once an area books, only that ASM (or admin) can change the time.
- **Admin login** (code in `src/page.html`, search `ADMIN_CODE`) unlocks Schedule, Areas, Notes and Report.
- Report: two screenshots in, Word report out (Rajshahi layout).

## Deploy
Drag the folder onto Netlify Drop or Vercel, or push to GitHub Pages. It loads JSZip and fonts from public CDNs.

## Important
Shared bookings, private notes and screenshot reading use the Claude artifact runtime
(`window.claude`: db, user, sample, downloads). On any other host those are absent, so the page
falls back to offline mode: bookings stay in one browser and screenshot reading is unavailable.
For shared bookings on your own domain, the `store` object in the script (localStore / dbStore)
is the single place to swap in Firebase or Supabase.
The admin code is checked in the browser, so it is a convenience lock, not real security.
