import settings from '../data/settings.json';

export function handleResponse(response, title, rows) {
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
