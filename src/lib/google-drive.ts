import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function saveReportToDrive(reportId: string, reportData: any): Promise<string | null> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const fileName = `FinFriend_Report_${reportId}_${new Date().toISOString().split('T')[0]}.json`;
    const fileContent = JSON.stringify(reportData, null, 2);
    
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: fileContent,
      },
      fields: 'id, webViewLink',
    });

    console.log('Report saved to Google Drive:', response.data.webViewLink);
    return response.data.webViewLink || null;
  } catch (error) {
    console.error('Error saving to Google Drive:', error);
    return null;
  }
}

export async function findOrCreateFolder(folderName: string): Promise<string | null> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const searchResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id || null;
    }

    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return createResponse.data.id || null;
  } catch (error) {
    console.error('Error finding/creating folder:', error);
    return null;
  }
}

export async function saveReportToDriveInFolder(reportId: string, reportData: any, folderName: string = 'FinFriend Reports'): Promise<string | null> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    
    const folderId = await findOrCreateFolder(folderName);
    
    const fileName = `FinFriend_Report_${reportId}_${new Date().toISOString().split('T')[0]}.json`;
    const fileContent = JSON.stringify(reportData, null, 2);
    
    const requestBody: any = {
      name: fileName,
      mimeType: 'application/json',
    };
    
    if (folderId) {
      requestBody.parents = [folderId];
    }
    
    const response = await drive.files.create({
      requestBody,
      media: {
        mimeType: 'application/json',
        body: fileContent,
      },
      fields: 'id, webViewLink',
    });

    console.log('Report saved to Google Drive folder:', response.data.webViewLink);
    return response.data.webViewLink || null;
  } catch (error) {
    console.error('Error saving to Google Drive folder:', error);
    return null;
  }
}
