/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { splitStartingEmoji } from "@/utils/stringUtils";

describe("string utilities", () => {
  test("splitStartingEmoji", () => {
    expect(splitStartingEmoji("some test string")).toStrictEqual({
      startingEmoji: undefined,
      rest: "some test string",
    });
    expect(
      splitStartingEmoji("😊 some test string with an emoji at the start")
    ).toStrictEqual({
      startingEmoji: "😊",
      rest: " some test string with an emoji at the start",
    });
    expect(
      splitStartingEmoji(
        "😊 😊 some test string with multiple emojis at the start separated by space"
      )
    ).toStrictEqual({
      startingEmoji: "😊",
      rest: " 😊 some test string with multiple emojis at the start separated by space",
    });
    expect(
      splitStartingEmoji(
        "🏜️ using apples troublesome emoji with .trim()"
      ).rest.trim()
    ).toStrictEqual("using apples troublesome emoji with .trim()");

    expect(
      splitStartingEmoji("🏜️ using apples troublesome emoji with .trim()")
    ).toStrictEqual({
      startingEmoji: "🏜️",
      rest: " using apples troublesome emoji with .trim()",
    });

    expect(
      splitStartingEmoji(
        "😊😊 some test string with multiple emojis at the start"
      )
    ).toStrictEqual({
      startingEmoji: "😊",
      rest: "😊 some test string with multiple emojis at the start",
    });
    expect(
      splitStartingEmoji("👋🏿 some test string with colors emoji at the start")
    ).toStrictEqual({
      startingEmoji: "👋🏿",
      rest: " some test string with colors emoji at the start",
    });
    expect(
      splitStartingEmoji("some test string with an emoji at the end 😊")
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
