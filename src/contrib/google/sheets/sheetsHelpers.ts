export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

export function isAuthError(error: { code: number }): boolean {
  return [404, 401, 403].includes(error.code);
}

export function columnToLetter(column: number): string {
  // https://stackoverflow.com/a/21231012/402560
  let temporary;
  let letter = "";
  while (column > 0) {
    temporary = (column - 1) % 26;
    letter = String.fromCodePoint(temporary + 65) + letter;
    column = (column - temporary - 1) / 26;
  }

  return letter;
}
