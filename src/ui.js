import settings from '../data/settings.json';

export async function withDoneMsg(message, fun) {
  process.stdout.write(`${message}... `);
  const returnValue = await fun();
  console.log('done.');

  return returnValue;
}

export function printRowCount(index, length) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(`Processing row ${index}/${length}... `);
}

export function correctionMessage(side, { ID, Eesti, Inglise, apiRow }) {
  console.log(`${settings[side].subject_name} correction needed in the row:`);
  console.log({ ID, Eesti, Inglise });
  console.log('The new row object is:');
  console.log(apiRow.toObject());
  console.log('The correction will be inserted in the spreadsheet.');
}

export function handleResponse(response, title, rows) {
  if (response.error) {
    console.log('The program has encountered an error.');
  } else {
    const countNonNull = (acc, elt) => (elt ? acc + 1 : acc);
    const inserted = response.result.reduce(countNonNull, 0);
    const duplicates =
      inserted === rows.length ? '' : 'Since duplicates are skipped, ';
    console.log(
      `The spreadsheet "${title}" has ${rows.length} rows. ${duplicates}${
        inserted ? inserted * 2 : 'no'
      } cards were inserted into the ${settings.deck_name} deck. ${
        inserted ? 'Have fun!' : ''
      }`
    );
  }
}
