import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet as Sheet } from 'google-spreadsheet';

import credentials from './api_key.json';

const jwt = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: credentials.scopes,
});

const doc = new Sheet(credentials.file_id, jwt);
await doc.loadInfo();
const sheet = doc.sheetsByIndex[0];
const rows = await sheet.getRows();
for (let row of rows) {
  console.log(`${row.get('Sõna')}: ${row.get('Inglise')}`);
}