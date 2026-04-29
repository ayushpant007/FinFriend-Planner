import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1QsAoaJMcohIq2Pc6q9cq0yQxoyN8l_asXfDtsLlQWlk';

export async function POST(req: Request) {
  try {
    const { name, dob, mobile, email, riskAppetite = '', selectedSchemes = '' } = await req.json();

    if (!name || !dob || !mobile || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('Google Sheets integration skipped: Missing credentials in .env');
      return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
    }

    // Replace literal \n with actual newlines in case it's stringified in .env
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // We assume the first sheet is named "Sheet1". If it's different, this will need to be updated.
    const range = 'Sheet1!A:F';
    let getResponse;
    try {
      getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      });
    } catch (e: any) {
      console.error('Error fetching sheet. Make sure the Service Account email has Editor access:', e.message);
      return NextResponse.json({ error: 'Failed to access sheet' }, { status: 500 });
    }

    const rows = getResponse.data.values || [];
    let rowIndexToUpdate = -1;

    // Search for email in the existing rows (Column D, index 3)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][3] === email) {
        rowIndexToUpdate = i + 1; // 1-based index for Google Sheets (Row 1 is header usually)
        break;
      }
    }

    const values = [[name, dob, mobile, email, riskAppetite, selectedSchemes]];

    if (rowIndexToUpdate !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowIndexToUpdate}:F${rowIndexToUpdate}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return NextResponse.json({ success: true, action: 'updated' });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
      return NextResponse.json({ success: true, action: 'appended' });
    }

  } catch (error: any) {
    console.error('Save to Sheets API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
