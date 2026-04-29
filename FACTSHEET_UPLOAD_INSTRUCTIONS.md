# How to Upload Your Factsheet PDFs

Your factsheet folders are now ready! Follow these simple steps to upload your PDF files:

## Step 1: Upload PDFs to the Correct Folders

1. Go to the Replit file browser
2. Navigate to `public/factsheets/`
3. You'll see 45 folders, one for each mutual fund company
4. Upload your PDF files to the corresponding company folder

Example:
- For **Angel One mutual funds**, upload PDFs to: `public/factsheets/Angel One mutual fund/`
- For **HDFC mutual funds**, upload PDFs to: `public/factsheets/HDFC mutual fund/`

## Step 2: Update factsheets.json (Already Done!)

The `public/factsheets.json` file has been pre-configured with local paths. Just make sure your PDF filenames match the ones in the JSON file, or update the JSON to match your actual filenames.

## Example factsheets.json Entry:

```json
{
  "Angel One Mutual Fund": {
    "Angel One": "/factsheets/Angel One mutual fund/Angel-One-Mutual-Fund-Schemes-Aug-2025-1.pdf"
  }
}
```

If your PDF has a different filename, just update the path in `factsheets.json`.

## Current Setup:

✅ All 45 mutual fund company folders created
✅ factsheets.json configured with local paths
✅ Code updated to use local PDFs instead of Firebase Storage
✅ No more Firebase permissions errors!

## What Happens Next:

1. Upload your PDF files to the appropriate folders
2. The app will automatically load them from the local filesystem
3. PDFs will load instantly without any Firebase Storage errors
4. AI analysis will work on the PDFs as soon as they're uploaded

## Folder List (All Created):

- 360 ONE mutual fund
- Aditya Birla Sun Life mutual fund
- Angel One mutual fund
- Axis mutual fund
- Bajaj Finserv mutual fund
- Bank of India mutual fund
- Baroda BNP Paribas mutual fund
- Canara Robeco mutual fund
- DSP mutual fund
- Edelweiss mutual fund
- Franklin Templeton mutual fund
- Groww mutual fund
- HDFC mutual fund
- HSBC mutual fund
- Helios mutual fund
- ICICI Prudential mutual fund
- IDBI mutual fund
- ITI mutual fund
- Invesco mutual fund
- JM Financial mutual fund
- Kotak Mahindra mutual fund
- LIC mutual fund
- Mahindra Manulife mutual fund
- Mirae Asset mutual fund
- Motilal Oswal mutual fund
- NJ mutual fund
- Navi mutual fund
- Nippon India mutual fund
- Old Bridge mutual fund
- PGIM India mutual fund
- PPFAS mutual fund
- Quant mutual fund
- Quantum mutual fund
- SBI mutual fund
- Samco mutual fund
- Shriram mutual fund
- Sundaram mutual fund
- Tata mutual fund
- Taurus mutual fund
- Trust mutual fund
- Unifi mutual fund
- Union mutual fund
- UTI mutual fund
- WhiteOak Capital mutual fund
- Zerodha mutual fund

Start uploading your PDFs and they'll work immediately!
