import { loadSheetData } from './google_sheets';

import settings from '../data/settings.json';
import constants from '../data/constants.json';

async function main() {
  const { title, rows } = await loadSheetData();
  const notes = rows.map(buildNote);
  const fetchOptions = buildFetchOptions(notes);
  const response = await (await fetch(constants.ankiURL, fetchOptions)).json();
  handleResponse(response, title, rows);
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

function handleResponse(response, title, rows) {
  if (response.error) {
    console.log('The program has encountered an error.');
  } else {
    const countNonNull = (acc, elt) => (elt ? acc + 1 : acc);
    const inserted = response.result.reduce(countNonNull, 0);
    const duplicates =
      inserted == rows.length ? '' : 'Since duplicates are skipped, ';
    console.log(
      `The spreadsheet "${title}" has ${rows.length} rows. ${duplicates}${
        inserted ? inserted * 2 : 'no'
      } cards were inserted into the ${settings.deck_name} deck. ${
        inserted ? 'Have fun!' : ''
      }`
    );
  }
}

main();
