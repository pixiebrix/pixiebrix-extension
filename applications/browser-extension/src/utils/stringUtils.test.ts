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

import {
  extractMarkdownLink,
  matchesAnyPattern,
  smartAppendPeriod,
  splitStartingEmoji,
  trimEndOnce,
} from "./stringUtils";

describe("string utilities", () => {
  test("splitStartingEmoji", () => {
    expect(splitStartingEmoji("some test string")).toStrictEqual({
      startingEmoji: undefined,
      rest: "some test string",
    });
    expect(
      splitStartingEmoji("😊 some test string with an emoji at the start"),
    ).toStrictEqual({
      startingEmoji: "😊",
      rest: " some test string with an emoji at the start",
    });
    expect(
      splitStartingEmoji(
        "😊 😊 some test string with multiple emojis at the start separated by space",
      ),
    ).toStrictEqual({
      startingEmoji: "😊",
      rest: " 😊 some test string with multiple emojis at the start separated by space",
    });
    expect(
      splitStartingEmoji(
        "🏜️ using apples troublesome emoji with .trim()",
      ).rest.trim(),
    ).toBe("using apples troublesome emoji with .trim()");

    expect(
      splitStartingEmoji("🏜️ using apples troublesome emoji with .trim()"),
    ).toStrictEqual({
      startingEmoji: "🏜️",
      rest: " using apples troublesome emoji with .trim()",
    });

    expect(
      splitStartingEmoji(
        "😊😊 some test string with multiple emojis at the start",
      ),
    ).toStrictEqual({
      startingEmoji: "😊",
      rest: "😊 some test string with multiple emojis at the start",
    });
    expect(
      splitStartingEmoji("👋🏿 some test string with colors emoji at the start"),
    ).toStrictEqual({
      startingEmoji: "👋🏿",
      rest: " some test string with colors emoji at the start",
    });
    expect(
      splitStartingEmoji("some test string with an emoji at the end 😊"),
    ).toStrictEqual({
      startingEmoji: undefined,
      rest: "some test string with an emoji at the end 😊",
    });
    expect(splitStartingEmoji("")).toStrictEqual({
      startingEmoji: undefined,
      rest: "",
    });
    expect(splitStartingEmoji("😊")).toStrictEqual({
      startingEmoji: "😊",
      rest: "",
    });
  });
});

describe("trimEndOnce", () => {
  it("allows null", () => {
    expect(trimEndOnce(null, " ")).toBeNull();
  });

  it("trims only once", () => {
    expect(trimEndOnce("aa", "a")).toBe("a");
  });

  it("trims only if match", () => {
    expect(trimEndOnce("ab", "a")).toBe("ab");
  });
});

describe("matchesAnyPattern", () => {
  test("matches a string array", () => {
    expect(matchesAnyPattern("hello", ["hi", "howdy", "hello"])).toBeTruthy();
    expect(
      matchesAnyPattern("hello", ["hi", "howdy", "hello y’all"]),
    ).toBeFalsy();
    expect(matchesAnyPattern("yellow", ["hi", "howdy", "hello"])).toBeFalsy();
  });
  test("matches a regex array", () => {
    expect(matchesAnyPattern("hello", [/^hel+o/, /(ho ){3}/])).toBeTruthy();
    expect(matchesAnyPattern("hello", [/^Hello$/])).toBeFalsy();
  });
});

describe("smartAppendPeriod", () => {
  it("adds when missing", () => {
    expect(smartAppendPeriod("add")).toBe("add.");

    // After ])
    expect(smartAppendPeriod("append (parens)")).toBe("append (parens).");
    expect(smartAppendPeriod("append [bracket]")).toBe("append [bracket].");

    // Before "'
    expect(smartAppendPeriod("prepend 'apos'")).toBe("prepend 'apos.'");
    expect(smartAppendPeriod('prepend "quotes"')).toBe('prepend "quotes."');
  });

  it("keeps it if present", () => {
    const punctuation = ",.;:?!";
    const strings = [
      "keep",
      "keep (parens)",
      "keep [bracket]",
      "keep 'apos'",
      'keep "quotes"',
    ];

    for (const string of strings) {
      for (const piece of punctuation) {
        // Test trailing punctuation
        expect(smartAppendPeriod(string + piece)).toBe(string + piece);

        // Test punctuation to the left of )]"'
        if (/\W$/.test(string)) {
          const punctuationBeforeWrapper = [...string];
          punctuationBeforeWrapper.splice(-1, 0, piece); // Add punctuation
          expect(smartAppendPeriod(punctuationBeforeWrapper.join(""))).toBe(
            punctuationBeforeWrapper.join(""),
          );
        }
      }
    }
  });
});

describe("extractMarkdownLink", () => {
  it("extracts a Markdown link from a string", () => {
    const text =
      "This is a test string with a [Markdown link](https://example.com)";
    const result = extractMarkdownLink(text);
    expect(result).toEqual({
      rest: "This is a test string with a",
      label: "Markdown link",
      url: "https://example.com",
    });
  });

  it("extracts a Markdown link with no label or url", () => {
    const text = "This is a test string with a []()";
    const result = extractMarkdownLink(text);
    expect(result).toEqual({
      rest: "This is a test string with a",
      label: "",
      url: "",
    });
  });

  it("only extracts the last Markdown link in the string", () => {
    const text =
      "This is a test string with two links [one](oneUrl) [two](twoUrl)";
    const result = extractMarkdownLink(text);
    expect(result).toEqual({
      rest: "This is a test string with two links [one](oneUrl)",
      label: "two",
      url: "twoUrl",
    });
  });

  it("returns null if the string does not contain a Markdown link", () => {
    const text = "This is a test string without a Markdown link";
    const result = extractMarkdownLink(text);
    expect(result).toBeNull();
  });

  it("returns null if the Markdown link is not at the end of the string", () => {
    const text =
      "This is a [Markdown link](https://example.com) in the middle of a test string";
    const result = extractMarkdownLink(text);
    expect(result).toBeNull();
  });
});
