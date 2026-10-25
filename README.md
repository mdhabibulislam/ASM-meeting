# ASM Meeting Desk

Red and white meeting desk for 27 areas.

- First-come booking: start of month (days 1-9, Fridays off) and end of month (days 25-30)
- Host-only meeting notes per area
- Report maker: two Employee Performance Analysis screenshots in, Word report out (Rajshahi layout)

`index.html` is the whole page (published as a Claude artifact). `src/` holds the report code (`core.js`), example rows and the page template.
Live data uses the Claude artifact runtime (db, user, sample, downloads), so bookings only persist when the page runs inside Claude.
