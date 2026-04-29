# Factsheets Directory

This directory contains mutual fund factsheet PDFs organized by fund house.

## Structure

Each mutual fund company has its own folder. Upload your PDF factsheets into the corresponding company folder.

## Example

For Angel One mutual fund schemes, upload PDFs to:
`/public/factsheets/Angel One mutual fund/`

## Naming Convention

You can name the PDF files anything you like. The system will map them based on the scheme names in `factsheets.json`.

## After Uploading

After uploading PDF files, update the `/public/factsheets.json` file to map scheme names to the PDF filenames.

Example entry in factsheets.json:
```json
{
  "Angel One Mutual Fund": {
    "Angel One": "/factsheets/Angel One mutual fund/your-pdf-filename.pdf"
  }
}
```
