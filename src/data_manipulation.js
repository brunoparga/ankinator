import settings from '../data/settings.json';
import constants from '../data/constants.json';

function deflag(string, flag) {
  return string.replace(`${flag} `, '');
}

export function buildDeckData(deck) {
  const fronts = deck.map((card) => card.front);
  const backs = deck.map((card) => card.back);
  const IDs = deck.map((card) => card.id);

  return { fronts, backs, IDs, count: IDs.length };
}

export function ankiDataToNote(data) {
  return {
    id: data.noteId,
    front: deflag(data.fields.Front.value, settings.front.flag),
    back: deflag(data.fields.Back.value, settings.back.flag),
  };
}

function buildCardData(source) {
  if ('get' in source) {
    let ID = source.get('ID');
    ID = ID ? parseInt(ID) : ID;
    return {
      front: source.get(settings.front.column_name),
      back: source.get(settings.back.column_name),
      ID,
    };
  } else if (source.hasOwnProperty('front') && source.hasOwnProperty('back')) {
    return {
      front: source.front,
      back: source.back,
      ID: source.ID,
    };
  } else {
    throw new Error(
      'Cannot build note from this source.\nExpected either a GoogleSpreadsheetRow object or an object with "front" and "back" properties.'
    );
  }
}

function reflag(side, text) {
  return `${settings[side].flag} ${text}`;
}

function buildNote(notes, apiRow) {
  const { front, back, ID } = buildCardData(apiRow);
  const { insertRows, updateRows } = notes;
  if (ID) {
    return {
      insertRows,
      updateRows: updateRows.concat([{ front, back, ID }]),
    };
  } else {
    const insertRow = [
      {
        deckName: settings.deck_name,
        modelName: settings.model_name,
        fields: {
          Front: `${reflag('front', front)}`,
          Back: `${reflag('back', back)}`,
        },
        options: constants.noteOptions,
      },
    ];
    return { updateRows, insertRows: insertRows.concat(insertRow) };
  }
}

export function buildNotes(apiRows) {
  return apiRows.reduce(buildNote, { insertRows: [], updateRows: [] });
}
