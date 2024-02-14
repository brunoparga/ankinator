import { loadSheetData, updateSheet } from './google_sheets';
import { createFlashcards, flashcardsAsJson, notesFromIDs, updateFlashcards } from './anki';
import { handleResponse, withDoneMsg } from './ui';
import { notTooRecent } from './validation';

import { needsFlashcard } from '../data/sync_report.json';
import { buildNotes } from './data_manipulation';
import newNoteIds from '../response.json'

//== TODO: check if Anki is running and, if it isn't, start it
//== TODO: check if my VPN is running and, if it is, turn it off
//== TODO: add flags for what I want to do and a --dry-run one to
//==       avoid needlessly hitting the API

//== This was when the collections kinda drifted out of sync,
//== and the sheet didn't have IDs. As long as I cannot trigger
//== a sheet-to-anki sync from my phone, I will need to do this
//== occasionally in case I make edits to cards on my phone, so
//== that the sheet remains in sync.
// await updateSheet(flashcards);

//== This inserts flashcards from the sheet into anki. If the source
//== of `notes` is just `rows`, it goes through everything (probably
//== should deprecate that). `needsFlashcard` should make its way back
//== into the report.
//== Ultimately the thingy should:
//==   1. Read all flashcards.
//==   2. Read all sheet rows.
//==   3. Report on anything that is mismatched with the same ID.
//==   4. Add any flashcards from Anki into the sheet, with IDs.
//==   5. Create flashcards from sheet rows where needed.
//==   6. Update the relevant rows with the flashcard IDs.
// if (notTooRecent()) {
const { title, apiRows } = await loadSheetData();
// const notes = buildNotes(apiRows);
// const notes = needsFlashcard.map(buildNote);
// const response = await createFlashcards(notes);
// const flashcards = await flashcardsAsJson();
// console.log(`Read ${flashcards.count} notes.`);
// const response = synchronizeCollections(notes, flashcards);
// handleResponse(response, title, apiRows);
// }

const newNotes = await notesFromIDs(newNoteIds)
console.log(newNotes[0])


function synchronizeCollections(notes, flashcards) {
  // notes is an object with an array of InsertRow objects and
  // an array of UpdateRow objects; the difference is whether they
  // have an id.
  console.log(
    `There are ${notes.insertRows.length} new rows to insert and ${notes.updateRows.length} existing rows to check.`
  );
  // flashcards is an object with an array of Fronts, an array of Backs
  // and an array of IDs
  console.log(flashcards);
}

//== Right now, what I will focus on is just two things:
//== 1 - put the flags back into the flashcards;
//== 2 - replace ellipses with dashes.
//== None of this needs to touch the spreadsheet.
// withDoneMsg('Updating flashcards with flags and dashes', async () => {
//   await updateFlashcards(flashcards)
// })
