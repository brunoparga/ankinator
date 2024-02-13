import { loadSheetData, updateSheet } from './google_sheets';
import { createFlashcards, flashcardsAsJson, buildNote } from './anki';
import { handleResponse } from './ui';
import { notTooRecent } from './validation';

import { needsFlashcard } from '../data/sync_report.json';

const flashcards = await flashcardsAsJson();
console.log(`Read ${flashcards.length} notes.`)
await updateSheet(flashcards);

// if (notTooRecent()) {
  // // const { title, rows } = await loadSheetData();
  // // const notes = rows.map(buildNote)
  // // const notes = needsFlashcard.map(buildNote);
  // const response = await createFlashcards(notes);
  // handleResponse(response, title, rows);
// }
