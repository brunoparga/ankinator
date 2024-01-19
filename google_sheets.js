import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet as Sheet } from 'google-spreadsheet';

import credentials from './api_key.json';
import settings from './settings.json';

function buildJWT() {
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: credentials.scopes,
  });
}

export async function loadSheetData() {
  const doc = new Sheet(settings.file_id, buildJWT());
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  return { title: doc.title, rows };
}
