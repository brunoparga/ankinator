import settings from '../data/settings.json';
import constants from '../data/constants.json';
import { withDoneMsg } from './ui';
import { ankiDataToNote, buildDeckData } from './data_manipulation';

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

export async function notesFromIDs(noteIDs) {
  const body = {
    action: 'notesInfo',
    params: { notes: noteIDs },
  };
  return await ankiFetch(body, 'Converting note IDs into actual notes');
}

export async function createFlashcards(notes) {
  const body = { action: 'addNotes', params: { notes } };
  return await ankiFetch(body, 'Creating flashcards');
}

export async function updateFlashcards(notesJson) {
  const ellipsis = /\.\.\./g;
  const notes = notesJson.map(({ id, front, back }) => ({
    id,
    fields: {
      Front: `${reflag('front', front).replace(ellipsis, '-')}`,
      Back: `${reflag('back', back).replace(ellipsis, '-')}`,
    },
  }));
  for (const note of notes) {
    const body = { action: 'updateNoteFields', params: { note } };
    await ankiFetch(body, `Updating ${note.fields.Front}/${note.fields.Back}`);
    Bun.sleepSync(50);
  }
}

export async function flashcardsAsJson() {
  const IDs = await readNoteIDs();
  const ankiData = await notesFromIDs(IDs);
  const notes = ankiData.map(ankiDataToNote);
  return buildDeckData(notes);
}
