import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet as Sheet } from 'google-spreadsheet';

import credentials from '../data/api_key.json';
import settings from '../data/settings.json';
import constants from '../data/constants.json';
import { correctionMessage, withDoneMsg } from './ui';

function buildJWT() {
  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: credentials.scopes,
  });
}

async function loadDocument() {
  const doc = new Sheet(settings.file_id, buildJWT());
  await doc.loadInfo();

  return doc;
}

function buildDeckData(deck) {
  const fronts = deck.map((card) => card.front);
  const backs = deck.map((card) => card.back);
  const IDs = deck.map((card) => card.id);

  return { fronts, backs, IDs };
}

function initializeReport(rows, deck) {
  return Object.assign(
    {
      totalRows: rows.length,
      totalFlashcards: deck.length,
    },
    constants.reportDefaults
  );
}

function printRowCount(index, length) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(`Processing row ${index}/${length}... `);
}

function setRowStatus(data, cardIds) {
  if (
    data.frontIndex == data.backIndex &&
    data.frontIndex != -1 &&
    data.rowId == cardIds[data.frontIndex]
  ) {
    return 'perfect';
  } else if (data.frontIndex == data.backIndex && data.frontIndex != -1) {
    return 'needs ID';
  } else if (data.frontIndex == data.backIndex) {
    return 'needs Anki card';
  } else if (data.backIndex != 1 && data.frontIndex == -1) {
    return 'Front correction';
  } else if (data.frontIndex != 1 && data.backIndex == -1) {
    return 'Back correction';
  } else if (data.frontIndex != data.backIndex) {
    return 'error';
  }
}

function buildRowData(apiRow, deckData) {
  let data = { apiRow };
  data.oldRow = JSON.parse(JSON.stringify(apiRow.toObject()));
  data.rowFront = apiRow.get(settings.front.column_name);
  data.rowBack = apiRow.get(settings.back.column_name);
  data.rowId = apiRow.get('ID');
  data.frontIndex = deckData.fronts.findIndex(
    (cardFront) => cardFront == data.rowFront
  );
  data.backIndex = deckData.backs.findIndex(
    (cardBack) => cardBack == data.rowBack
  );
  data.rowStatus = setRowStatus(data, deckData.IDs);

  return data;
}

async function addId(cardIds, rowData, apiRow, report) {
  const id = cardIds[rowData.frontIndex];
  apiRow.set('ID', id);
  await apiRow.save();
  Bun.sleepSync(167);
  report.neededId = report.neededId.concat([id]);
}

function buildCorrectRow(rowData, deckData) {
  const values = {};
  if (rowData.rowStatus == 'Front correction') {
    values.side = 'front';
    values.reference = rowData.rowBack;
    values.incorrect = rowData.rowFront;
    values.correct = deckData.fronts[rowData.backIndex];
  } else if (rowData.rowStatus == 'Back correction') {
    values.side = 'back';
    values.reference = rowData.rowFront;
    values.incorrect = rowData.rowBack;
    values.correct = deckData.backs[rowData.frontIndex];
  }

  return values;
}

async function correctRow(verbose, rowData, deckData) {
  const values = buildCorrectRow(rowData, deckData);
  rowData.apiRow.set(settings.front.column_name, values.correct);

  if (rowData.rowId == undefined) {
    rowData.apiRow.set('ID', cardIds[rowData.backIndex]);
  } else if (rowData.rowId != cardIds[rowData.backIndex]) {
    throw new Error(
      `Card ${rowData.rowBack} has conflicting IDs between the spreadsheet and Anki.`
    );
  }

  if (verbose) {
    correctionMessage(values.side, rowData.oldRow, rowData.apiRow);
  }
  // await row.save();
  Bun.sleepSync(167);
  diff = {
    id: apiRow.ID,
    [values.reference]: values.reference,
    [values.incorrect]: values.incorrect,
    [values.correct]: values.correct,
  };
  report.correctedMatches = report.correctedMatches.concat([diff]);
}

export async function loadSheetData() {
  const doc = await loadDocument();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  return { title: doc.title, rows };
}

export async function updateSheet(deck) {
  const { rows } = await withDoneMsg(
    'Reading the spreadsheet from Google',
    loadSheetData
  );

  const report = initializeReport(rows, deck);
  const deckData = buildDeckData(deck);

  for (let index = 0; index < rows.length; index++) {
    printRowCount(index + 1, rows.length);
    const rowData = buildRowData(rows[index], deckData);
    switch (rowData.rowStatus) {
      case 'perfect':
        report.perfectMatches += 1;
        break;
      case 'needs ID':
        await addId(deckData.IDs, rowData, row, report);
        break;
      case 'needs Anki card':
        // This does NOT need to create the card. The cards
        // will be batch-created later to save on Google API calls.
        report.needsFlashcard = report.needsFlashcard.concat([
          { front: rowData.rowFront, back: rowData.rowBack },
        ]);
        break;
      case 'Front correction':
      case 'Back correction':
        const verbose =
          process.argv.includes('--verbose') || process.argv.includes('-v');
        correctRow(verbose, rowData, deckData, apiRow);
        break;
      case 'error':
        console.log('An error was encountered for the row:');
        console.log(oldRow);
        console.log('Here are the relevant flashcards:');
        const diff = {
          cardAtFrontIndex: deck[rowData.frontIndex],
          cardAtBackIndex: deck[rowData.backIndex],
        };
        console.log(diff);
        report.errors = report.errors.concat([diff]);
        break;
    }
  }

  // TODO: add flashcards that are in the spreadsheet but not the deck;
  // write their IDs back to the spreadsheet.

  console.log('done.');
  withDoneMsg('Writing report to file', async () => {
    await Bun.write('../data/report.json', JSON.stringify(report, null, '\t'));
  });
}
