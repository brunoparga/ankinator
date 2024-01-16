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

const notes = rows.map((row) => ({
  deckName: 'Fesf',
  modelName: 'Basic (and reversed card)',
  fields: {
    Front: `🇪🇪 ${row.get('Sõna')}`,
    Back: `🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${row.get('Inglise')}`,
  },
  options: {
    allowDuplicate: false,
    duplicateScope: 'deck',
    duplicateScopeOptions: {
      checkAllModels: true,
    },
  },
}));

const options = {
  method: 'POST',
  body: JSON.stringify({
    action: 'addNotes',
    version: 6,
    params: { notes },
  }),
};

const ankiURL = 'http://127.0.0.1:8765';

const response = await (await fetch(ankiURL, options)).json();

if (response.error) {
  console.log('The program has encountered an error.');
} else {
  const countNonNull = (acc, elt) => (elt ? acc + 1 : acc);
  const inserted = response.result.reduce(countNonNull, 0);
  const duplicates =
    inserted == rows.length ? '' : 'Since duplicates are skipped, ';
  console.log(
    `The spreadsheet "${doc.title}" has ${rows.length} rows. ${duplicates}${
      inserted ? inserted * 2 : 'no'
    } cards were inserted in the deck. ${inserted ? 'Have fun!' : ''}`
  );
}
