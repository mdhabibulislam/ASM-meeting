# ASM Meeting Desk (Anwar Cement Sheet)

Meeting booking for 27 areas, with the database stored **in your own GitHub repo**.

- ASMs see only **Book a time**: area, start (days 1-9) or end (days 25-30) of month, then a free time. First to tap gets it. Fridays off. Max 3 meetings a day.
- Once an area books, only that ASM or the admin can change it.
- **Admin login** (code 9999, change it with `ADMIN_CODE`) unlocks Schedule, Areas, Notes, Report, and removing bookings.
- Report: add rows, download a Word file in the Rajshahi layout.

## Files
- `index.html` phone layout on phones, PC layout on wide screens (use this one)
- `mobile.html` always phone layout, `pc.html` always PC layout
- `api/db.js` the database function (reads and writes JSON files in your repo)
- `data/` starting data files, `vercel.json` Vercel settings, `src/` page source

## Set up (10 minutes, once)
1. **Create a PRIVATE repo** on GitHub, for example `asm-meeting-desk`. Keep it private: bookings and notes are saved in it.
   Upload every file in this folder to it (Add file > Upload files), on the `main` branch.
2. **Create an access token.** GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
   Repository access: Only select repositories > your repo. Permissions: **Contents: Read and write**. Copy the token (it is shown once).
3. **Deploy on Vercel.** vercel.com > Add New > Project > import the repo. Before Deploy, add Environment Variables:
   - `GITHUB_TOKEN` = the token from step 2
   - `GITHUB_REPO` = `your-github-name/asm-meeting-desk`
   - `ADMIN_CODE` = `9999` (or a new code)
   Press Deploy.
4. Open the Vercel link, book a time, then look in your repo: a `data` branch appears with `data/bookings.json`. Every booking is a commit, so GitHub keeps the full history.

## How it works
Data lives on a separate `data` branch, so saving a booking does not redeploy the site. The function uses GitHub's file version (`sha`) as a lock, so if two ASMs tap the same time at once, only one gets it, and the 3-per-day limit holds. The admin code is checked on the server, not in the page, and the token never reaches the browser.
The page checks for new bookings every few seconds.

## Notes
- Reading screenshots with Claude only works on the Claude link. On this site use **Load example rows** or **Add a row by hand**, then download the Word report.
- If the page says it is not connected to a shared database, `GITHUB_TOKEN` or `GITHUB_REPO` is missing or wrong in Vercel. Fix it and redeploy.
