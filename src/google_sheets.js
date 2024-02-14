import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet as Sheet } from 'google-spreadsheet';

import credentials from '../data/api_key.json';
import settings from '../data/settings.json';
import constants from '../data/constants.json';
import { correctionMessage, printRowCount, withDoneMsg } from './ui';

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

function initializeReport(rows, deck) {
  return Object.assign(
    {
      totalRows: rows.length,
      totalFlashcards: deck.length,
    },
    constants.reportDefaults
  );
}

function setRowStatus(frontIndex, backIndex, rowId, cardIds) {
  if (
    frontIndex === backIndex &&
    frontIndex != -1 &&
    parseInt(rowId) === cardIds[frontIndex]
  ) {
    return 'perfect';
  } else if (frontIndex === backIndex && frontIndex != -1) {
    return 'needs ID';
  } else if (frontIndex === backIndex) {
    return 'needs Anki card';
  } else if (backIndex != 1 && frontIndex === -1) {
    return 'Front correction';
  } else if (frontIndex != 1 && backIndex === -1) {
    return 'Back correction';
  } else if (frontIndex != backIndex) {
    return 'error';
  }
}

function buildRowData(apiRow, deckData) {
  let data = { apiRow };
  const oldRow = JSON.parse(JSON.stringify(apiRow.toObject()));
  data.rowFront = oldRow[settings.front.column_name];
  data.rowBack = oldRow[settings.back.column_name];
  data.rowId = oldRow.ID;
  data.frontIndex = deckData.fronts.findIndex(
    (cardFront) => cardFront === data.rowFront
  );
  data.backIndex = deckData.backs.findIndex(
    (cardBack) => cardBack === data.rowBack
  );
  data.rowStatus = setRowStatus(
    data.frontIndex,
    data.backIndex,
    data.rowId,
    deckData.IDs
  );

  return data;
}

async function addId(cardIds, rowData, report) {
  const id = cardIds[rowData.frontIndex];
  rowData.apiRow.set('ID', id);
  // await rowData.apiRow.save();
  // Bun.sleepSync(167);
  report.neededId = report.neededId.concat([id]);

  return report;
}

function buildCorrectRow(rowData, deckData) {
  const values = {};
  if (rowData.rowStatus === 'Front correction') {
    values.side = 'front';
    values.index = rowData.backIndex;
    values.reference = rowData.rowBack;
    values.incorrect = rowData.rowFront;
    values.correct = deckData.fronts[rowData.backIndex];
  } else if (rowData.rowStatus === 'Back correction') {
    values.side = 'back';
    values.index = rowData.frontIndex;
    values.reference = rowData.rowFront;
    values.incorrect = rowData.rowBack;
    values.correct = deckData.backs[rowData.frontIndex];
  }

  return values;
}

function capitalize(string) {
  return string.slice(0, 1).toUpperCase() + string.slice(1);
}

async function correctRow(verbose, rowData, deckData, report) {
  const values = buildCorrectRow(rowData, deckData);
  rowData.apiRow.set(settings[values.side].column_name, values.correct);

  if (rowData.rowId === undefined) {
    rowData.apiRow.set('ID', deckData.IDs[values.index]);
  } else if (rowData.rowId != deckData.IDs[values.index]) {
    throw new Error(
      `Card ${rowData.rowBack} has conflicting IDs between the spreadsheet and Anki.`
    );
  }

  if (verbose) {
    correctionMessage(values.side, rowData);
  }
  // await row.save();
  // Bun.sleepSync(167);
  const diff = {
    id: rowData.rowId,
    [values.side === 'front' ? 'back' : 'front']: values.reference,
    [`old${capitalize(values.side)}`]: values.incorrect,
    [`new${capitalize(values.side)}`]: values.correct,
  };
  report.correctedMatches = report.correctedMatches.concat([diff]);
  return report;
}

function handleCardError(deck, rowData) {
  console.log('An error was encountered for the row:');
  const row = { rowFront, rowBack, rowId } = rowData;
  console.log(row);
  console.log('Here are the relevant flashcards:');
  const diff = {
    cardAtFrontIndex: deck[rowData.frontIndex],
    cardAtBackIndex: deck[rowData.backIndex],
  };
  console.log(diff);
  report.errors = report.errors.concat([diff]);
}

export async function loadSheetData() {
  const doc = await loadDocument();
  const sheet = doc.sheetsByTitle[settings.deck_name];
  const apiRows = await sheet.getRows();

  return { title: doc.title, apiRows };
}

export async function updateSheet(deck) {
  const { rows } = await withDoneMsg(
    'Reading the spreadsheet from Google',
    loadSheetData
  );

  let report = initializeReport(rows, deck);
  const deckData = buildDeckData(deck);

  for (let index = 0; index < rows.length; index++) {
    printRowCount(index + 1, rows.length);
    const rowData = buildRowData(rows[index], deckData);
    const verbose =
      process.argv.includes('--verbose') || process.argv.includes('-v');
    switch (rowData.rowStatus) {
      case 'perfect':
        report.perfectMatches += 1;
        break;
      case 'needs ID':
        report = await addId(deckData.IDs, rowData, report);
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
        report = await correctRow(verbose, rowData, deckData, report);
        break;
      case 'error':
        handleCardError(deck, rowData);
        break;
    }
  }

  // TODO: add flashcards that are in the spreadsheet but not the deck;
  // write their IDs back to the spreadsheet.

  console.log('done.');
  withDoneMsg('Writing report to file', async () => {
    await Bun.write(
      constants.reportFilename,
      JSON.stringify(report, null, '\t')
    );
  });
}
