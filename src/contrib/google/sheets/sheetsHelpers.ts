export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim();
}

export function isAuthError(error: { code: number }): boolean {
  return [404, 401, 403].includes(error.code);
}

export function columnToLetter(column: number): string {
  // https://stackoverflow.com/a/21231012/402560
  let temp;
  let letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCodePoint(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}
