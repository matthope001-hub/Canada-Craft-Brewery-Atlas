# 🍺 Untappd Auto-Ratings — Setup Checklist

Complete these steps in order. Each builds on the last.

---

## PHASE 1 — Prerequisites (if not already done)
- [ ] 1. Create a free account at **github.com**
- [ ] 2. Create a free account at **vercel.com** (sign in with GitHub)
- [ ] 3. Create a free account at **cloudflare.com**
- [ ] 4. Deploy your `index.html` to Vercel (push to GitHub repo → import in Vercel → Deploy)
        - Your live URL will be something like `brewery-atlas.vercel.app`

---

## PHASE 2 — Build the Cloudflare Worker (the proxy)

- [ ] 5. Log into **cloudflare.com** → go to **Workers & Pages** → click **Create**
- [ ] 6. Choose **Create Worker** → name it `untappd-proxy` → click **Deploy**
- [ ] 7. Click **Edit Code** and paste in the worker code (I'll generate this for you)
- [ ] 8. Click **Save and Deploy**
- [ ] 9. Note your Worker URL — it will look like:
        `https://untappd-proxy.YOUR-NAME.workers.dev`

---

## PHASE 3 — Connect the Atlas to the Worker

- [ ] 10. Open `index.html` in your editor
- [ ] 11. Find the `UNTAPPD_PROXY` constant near the top of the script and paste your Worker URL
- [ ] 12. Save and push to GitHub → Vercel auto-deploys the update

---

## PHASE 4 — Add Untappd Slugs to Your Sheet

- [ ] 13. Open your Google Sheet
- [ ] 14. Confirm the `untappd` column exists (it should — it's in the template)
- [ ] 15. For each brewery, add their Untappd slug to the `untappd` column
        - Find it from their Untappd URL: `untappd.com/brewery/SLUG_IS_HERE`
        - Example: Collective Arts → `collectiveartsbrewing`
- [ ] 16. The atlas will now auto-fetch ratings for any brewery with a slug filled in

---

## PHASE 5 — Test It

- [ ] 17. Open your live Vercel URL
- [ ] 18. Find a brewery with an Untappd slug filled in
- [ ] 19. Confirm the ⭐ rating appears on the card
- [ ] 20. Open the browser console (F12) — check for any errors

---

## PHASE 6 — Optional: Rate Limiting & Caching

- [ ] 21. In your Cloudflare Worker, enable **KV Storage** (free tier) to cache ratings
          so you don't hammer Untappd on every page load
- [ ] 22. Set cache TTL to 24 hours (ratings don't change that often)

---

## What I'll build for you

When you're ready, tell me and I'll generate:

| Deliverable | What it is |
|---|---|
| `worker.js` | The Cloudflare Worker proxy code — paste & deploy |
| Updated `index.html` | With `UNTAPPD_PROXY` wired in and auto-fetch on load |

---

## Time estimate

| Phase | Time |
|---|---|
| Phase 1 (if not done) | 20–30 min |
| Phase 2 (Worker setup) | 10 min |
| Phase 3 (Connect atlas) | 5 min |
| Phase 4 (Add slugs) | Ongoing — a few seconds per brewery |
| Phase 5 (Test) | 5 min |

**Total first-time setup: ~30–45 minutes**
