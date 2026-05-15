# 🍺 Canada Craft Brewery Atlas — Setup Guide

A searchable, filterable brewery directory.
Built with plain HTML + JavaScript. No frameworks. No build step. Works in any browser.

---

## What you have

| File | What it does |
|---|---|
| `index.html` | The full website — search, filter, map links, detail modals |
| `brewery-template.csv` | Import this into Google Sheets as your database |
| `README.md` | This file |

---

## Step 1 — Set up your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it: **Canada Brewery Atlas**
3. Go to **File → Import** and import `brewery-template.csv`
4. Choose **Replace spreadsheet** and **No conversion**
5. You now have a spreadsheet with the correct column headers and example rows

### Column reference

| Column | What to put | Example |
|---|---|---|
| id | Unique ID — use b001, b002, b003... | b001 |
| name | The brewery's public/trade name | Collective Arts Brewing |
| legal_name | Official registered name | Collective Arts Brewing Co. |
| province | 2-letter province code | ON |
| city | City name | Hamilton |
| region | Region from our taxonomy | Niagara & Hamilton |
| type | micro / brewpub / nano / regional | micro |
| lat | Latitude (get from Google Maps) | 43.2664 |
| lng | Longitude (get from Google Maps) | -79.8370 |
| address | Street address | 207 Burlington St E |
| postal | Postal code | L8L 4H2 |
| phone | Phone number | 905-528-8017 |
| website | Full URL with https:// | https://collectiveartsbrewing.com |
| instagram | Handle with @ | @collectiveartsbrewing |
| facebook | Page name only | collectivearts |
| untappd | Untappd brewery slug | collectiveartsbrewing |
| taproom | TRUE or FALSE | TRUE |
| patio | TRUE or FALSE | TRUE |
| kitchen | TRUE or FALSE | FALSE |
| pet | TRUE or FALSE (pet-friendly) | TRUE |
| tours | TRUE or FALSE | FALSE |
| accessible | TRUE or FALSE (wheelchair) | TRUE |
| styles | Comma-separated beer styles | IPA, Lager, Sour |
| founded | Year founded | 2013 |
| ocb_member | TRUE or FALSE (guild/OCB member) | TRUE |
| verified | Date you verified the data | 2025-01-15 |
| status | active / closed / coming_soon | active |
| notes | Any public notes about the brewery | Famous for artist-designed cans. |

### How to get lat/lng from Google Maps
1. Search for the brewery on maps.google.com
2. Right-click on the brewery location
3. Click the coordinates at the top of the menu — they copy automatically
4. Paste into the lat and lng columns (lat first, lng second)

---

## Step 2 — Make your Sheet public

1. Click **Share** (top right)
2. Under **General access**, change to **Anyone with the link**
3. Set permission to **Viewer**
4. Click **Done**

---

## Step 3 — Get your Sheet ID

Your Sheet URL looks like this:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit
```

Copy everything between `/d/` and `/edit` — that's your Sheet ID.

---

## Step 4 — Connect the Sheet to your website

1. Open `index.html` in a text editor (Notepad, TextEdit, or VS Code)
2. Near the top, find this line:
   ```javascript
   const SHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
3. Replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID
4. Save the file

---

## Step 5 — Deploy to Vercel (free, shareable link)

### First time setup
1. Create a free account at [vercel.com](https://vercel.com)
2. Create a free account at [github.com](https://github.com)
3. Create a new GitHub repository called `brewery-atlas`
4. Upload your `index.html` file to the repository

### Deploy
1. In Vercel, click **Add New Project**
2. Connect your GitHub account
3. Select your `brewery-atlas` repository
4. Click **Deploy**
5. Vercel gives you a free URL like: `brewery-atlas.vercel.app`

### Updates
- Every time you push a change to GitHub, Vercel automatically re-deploys
- Your Google Sheet data updates live — no re-deploy needed when you add breweries

---

## Step 6 — Adding breweries

Just add rows to your Google Sheet. The website reads the Sheet live — no code changes needed.

**Tips:**
- Keep `status` as `active` for live breweries. Set to `closed` to hide them without deleting the row
- The website automatically hides rows where status = `closed`
- Always fill in `lat` and `lng` — they power the Get Directions button
- `id` must be unique for every row

---

## Upgrading later (when you're ready)

This setup is intentionally simple. When you've learned more, upgrade in stages:

| Stage | What changes | Why |
|---|---|---|
| **Now** | Google Sheet + HTML | No code knowledge needed |
| **Stage 2** | Add React components | Better UI, easier to extend |
| **Stage 3** | Move to Supabase | Real database, user auth, faster |
| **Stage 4** | Add Claim My Listing | Breweries manage their own data |

The HTML page is written so that **swapping Google Sheets for Supabase only requires changing ~20 lines of code** — everything else stays the same.

---

## Troubleshooting

**"The page shows sample data, not my Sheet"**
→ Check that `SHEET_ID` in `index.html` matches your actual Sheet ID exactly

**"I get an error when loading"**
→ Make sure your Sheet is set to "Anyone with the link can view" — not restricted

**"A brewery isn't showing up"**
→ Check that its `status` column says `active` (not `closed` or blank)

**"The Get Directions button doesn't work"**
→ Make sure `lat` and `lng` are filled in with numbers, not text

---

## Column headers must match exactly

The website looks for these exact column names in Row 1 of your Sheet:
```
id, name, legal_name, province, city, region, type, lat, lng,
address, postal, phone, website, instagram, facebook, untappd,
taproom, patio, kitchen, pet, tours, accessible,
styles, founded, ocb_member, verified, status, notes
```

Don't rename, reorder, or add spaces. If a column is empty for a brewery, just leave the cell blank.
