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

import { createStemMap, SearchText } from "./searchText";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new SearchText();

describe("createStemMap", () => {
  it("creates a stem map", () => {
    expect(createStemMap("it's raining in spain")).toEqual({
      text: "it' rain in spain",
      indexMap: new Map([
        [0, 0],
        [4, 5],
        [9, 13],
        [12, 16],
      ]),
    });
  });
});

describe("Search", () => {
  it("finds exact match", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        text: "the rain in spain",
        query: "rain",
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      matches: [{ length: 4, query: "rain", startIndex: 4, text: "rain" }],
    });
  });

  it.each([true, false])(
    "finds all exact matches; stemWords: %s",
    async (stemWords) => {
      const result = await brick.run(
        unsafeAssumeValidArg({
          text: "the rain in spain. the rain in witchita",
          query: "rain",
          stemWords,
        }),
        brickOptionsFactory(),
      );

      expect(result).toEqual({
        matches: [
          { length: 4, query: "rain", startIndex: 4, text: "rain" },
          { length: 4, query: "rain", startIndex: 23, text: "rain" },
        ],
      });
    },
  );

  it("stems the haystack", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        text: "it's raining in spaining",
        query: "rain",
        stemWords: true,
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      matches: [{ length: 7, query: "rain", startIndex: 5, text: "raining" }],
    });
  });

  it("stems query", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        text: "the rain in spain",
        query: "raining",
        stemWords: true,
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      matches: [{ length: 4, query: "raining", startIndex: 4, text: "rain" }],
    });
  });

  it("does not search within word", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        text: "I have rain on my brain",
        query: "rain",
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      matches: [{ length: 4, query: "rain", startIndex: 7, text: "rain" }],
    });
  });

  it("matches multiple stemmed words", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        text: "it's raining in spaining",
        query: "rain in spain",
        stemWords: true,
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      matches: [
        {
          length: 19,
          query: "rain in spain",
          startIndex: 5,
          text: "raining in spaining",
        },
      ],
    });
  });
});
