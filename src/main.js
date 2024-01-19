import { loadSheetData } from './google_sheets';
import { createFlashcards } from './anki';
import { handleResponse } from './ui';

const { title, rows } = await loadSheetData();
const response = await createFlashcards(rows);
handleResponse(response, title, rows);
