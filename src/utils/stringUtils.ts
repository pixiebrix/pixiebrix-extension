/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { type Nullish } from "./nullishUtils";

/**
 * If a string contains an emoji, returns an object that contains the separated emoji and the remaining string.
 */
export function splitStartingEmoji(value: string) {
  const emojiRegex =
    /^((?:\p{Extended_Pictographic}\p{Emoji_Modifier_Base}?\p{Emoji_Modifier}?\uFE0F?))?(.*)/u;
  const [, startingEmoji, rest = ""] = emojiRegex.exec(value) ?? [];
  return {
    startingEmoji,
    rest,
  };
}

/**
 * A version of lodash's `trimEnd` that only trims once.
 * @param value the original string
 * @param chars the characters to trim
 * @see trimEnd
 */
export function trimEndOnce(value: null, chars: string): null;
export function trimEndOnce(value: string, chars: string): string;
export function trimEndOnce(
  value: string | null,
  chars: string,
): string | null {
  if (value?.endsWith(chars)) {
    return value.slice(0, -chars.length);
  }

  return value;
}

const PUNCTUATION = [...".,;:?!"] as const;

/**
 * Appends a period to a string as long as it doesn't end with one.
 * Considers quotes and parentheses, and it always trims the trailing spaces.
 */
export function smartAppendPeriod(string: string): string {
  const trimmed = string.trimEnd();
  const [secondLastChar = "", lastChar = ""] = trimmed.slice(-2);

  const isAlreadyPunctuated =
    PUNCTUATION.includes(lastChar) || PUNCTUATION.includes(secondLastChar);
  if (isAlreadyPunctuated) {
    return trimmed;
  }

  const endsInAQuotation = lastChar === '"' || lastChar === "'";
  if (endsInAQuotation) {
    return trimmed.slice(0, -1) + "." + lastChar;
  }

  return trimmed + ".";
}

/**
 * Returns true if the value is nullish, not a string, or a string that is empty or only contains whitespace.
 */
export function isNullOrBlank(value: Nullish): true;
export function isNullOrBlank(value: string): boolean;
export function isNullOrBlank(value: unknown): false;
export function isNullOrBlank(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  return typeof value === "string" && value.trim() === "";
}

/** Tests a target string against a list of strings (full match) or regexes (can be mixed) */
export function matchesAnyPattern(
  target: string,
  patterns: Array<string | RegExp | ((x: string) => boolean)>,
): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return pattern === target;
    }

    if (typeof pattern === "function") {
      return pattern(target);
    }

    return pattern.test(target);
  });
}

export function escapeSingleQuotes(str: string): string {
  // https://gist.github.com/getify/3667624
  return str.replaceAll(/\\([\S\s])|(')/g, String.raw`\$1$2`);
}

/** Extracts a label and URL from a string ending with a Markdown link. It also returns the original text without the trailing link. */
export function extractMarkdownLink(text: string) {
  const markdownLinkRegex = /\[(?<label>[^\]]*)]\((?<url>[^)]*)\)$/;
  const match = markdownLinkRegex.exec(text);

  if (match?.groups) {
    return {
      rest: text.replace(markdownLinkRegex, "").trimEnd(),
      label: match.groups.label,
      url: match.groups.url,
    };
  }

  return null;
}
