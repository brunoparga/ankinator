import settings from '../data/settings.json';
import constants from '../data/constants.json';

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

export async function createFlashcards(rows) {
  const notes = rows.map(buildNote);
  const fetchOptions = buildFetchOptions(notes);
  const response = await (await fetch(constants.ankiURL, fetchOptions)).json();

  return response;
}
