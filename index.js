import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet as Sheet } from 'google-spreadsheet';

import credentials from './api_key.json';
import settings from './settings.json';
import constants from './constants.json';

async function main() {
  const doc = new Sheet(settings.file_id, buildJWT());
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  const notes = rows.map(buildNote);
  const fetchOptions = buildFetchOptions(notes);

  const response = await (await fetch(constants.ankiURL, fetchOptions)).json();
  handleResponse(response, doc, rows);
}

function buildJWT() {
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: credentials.scopes,
  });
}

function buildNote(row) {
  return {
    deckName: settings.deck_name,
    modelName: settings.model_name,
    fields: {
      Front: `${settings.front.flag} ${row.get(settings.front.column_name)}`,
      Back: `${settings.back.flag} ${row.get(settings.back.column_name)}`,
    },
    options: constants.noteOptions,
  };
}

function buildFetchOptions(notes) {
  const { fetchOptions } = constants;
  fetchOptions.verbose = process.argv.includes('--debug');
  fetchOptions.body.params.notes = notes;
  fetchOptions.body = JSON.stringify(fetchOptions.body);

  return fetchOptions;
}

function handleResponse(response, doc, rows) {
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
      } cards were inserted into the ${settings.deck_name} deck. ${inserted ? 'Have fun!' : ''}`
    );
  }
}

main();
