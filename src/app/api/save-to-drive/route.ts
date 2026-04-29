import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const DRIVE_FOLDER_ID = '0AGDw59r41e7eUk9PVA';

export async function POST(req: Request) {
  try {
    const { name, email, lifeQuotes, healthQuotes } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('Google Drive integration skipped: Missing credentials in .env');
      return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 });
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Format the file name based on the user's name
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${sanitizedName}_Proposals.json`;

    // Create the JSON content
    const fileContent = {
      name,
      email,
      lastUpdated: new Date().toISOString(),
      lifeInsuranceProposals: lifeQuotes || [],
      healthInsuranceProposals: healthQuotes || []
    };

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(fileContent, null, 2)
    };

    // Step 1: Search to see if a file for this user already exists in the folder
    let existingFileId = null;
    try {
      const searchRes = await drive.files.list({
        q: `name='${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      
      if (searchRes.data.files && searchRes.data.files.length > 0) {
        existingFileId = searchRes.data.files[0].id;
      }
    } catch (e: any) {
      console.error('Error searching drive:', e.message);
      // We don't fail immediately, we might just create a new one if search fails
    }

    // Step 2: Update existing or Create new file
    if (existingFileId) {
      await drive.files.update({
        fileId: existingFileId,
        media: media,
        supportsAllDrives: true
      });
      return NextResponse.json({ success: true, action: 'updated' });
    } else {
      const fileMetadata = {
        name: fileName,
        parents: [DRIVE_FOLDER_ID]
      };
      
      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
        supportsAllDrives: true
      });
      return NextResponse.json({ success: true, action: 'created' });
    }

  } catch (error: any) {
    console.error('Save to Drive API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
