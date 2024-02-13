import settings from '../data/settings.json';
import constants from '../data/constants.json';
import { withDoneMsg } from './ui';

function buildCardData(source) {
  if (typeof source == 'GoogleSpreadsheetRow') {
    return {
      front: source.get(settings.front.column_name),
      back: source.get(settings.back.column_name),
    };
  } else if (source.hasOwnProperty('front') && source.hasOwnProperty('back')) {
    return {
      front: source.front,
      back: source.back,
    };
  } else {
    throw new Error(
      'Cannot build note from this source.\nExpected either a GoogleSpreadsheetRow object or an object with "front" and "back" properties.'
    );
  }
}

function buildFetchParams(body) {
  const { fetchParams } = JSON.parse(JSON.stringify(constants));
  fetchParams.verbose = process.argv.includes('--debug');
  fetchParams.body = JSON.stringify(Object.assign(fetchParams.body, body));

  return fetchParams;
}

async function ankiFetch(body, message) {
  return withDoneMsg(message, async () => {
    const { result, error } = await (
      await fetch(constants.ankiURL, buildFetchParams(body))
    ).json();

    if (error) {
      throw new Error(error);
    }

    return result;
  });
}

async function readNoteIDs() {
  const body = {
    action: 'findNotes',
    params: { query: `deck:${settings.deck_name}` },
  };
  return await ankiFetch(body, 'Reading note IDs from Anki');
}

async function notesFromIDs(noteIDs) {
  const body = {
    action: 'notesInfo',
    params: { notes: noteIDs },
  };
  return await ankiFetch(body, 'Converting note IDs into actual notes');
}

function deflag(string, flag) {
  return string.replace(`${flag} `, '');
}

export function buildNote(source) {
  const { front, back } = buildCardData(source);
  return {
    deckName: settings.deck_name,
    modelName: settings.model_name,
    fields: {
      Front: `${settings.front.flag} ${front}`,
      Back: `${settings.back.flag} ${back}`,
    },
    options: constants.noteOptions,
  };
}

export async function createFlashcards(notes) {
  const body = { action: 'addNotes', params: { notes } };
  return await ankiFetch(body, 'Creating flashcards');
}

export async function flashcardsAsJson() {
  const noteIDs = await readNoteIDs();
  const notes = await notesFromIDs(noteIDs);
  return notes.map((note) => ({
    id: note.noteId,
    front: deflag(note.fields.Front.value, settings.front.flag),
    back: deflag(note.fields.Back.value, settings.back.flag),
  }));
}
