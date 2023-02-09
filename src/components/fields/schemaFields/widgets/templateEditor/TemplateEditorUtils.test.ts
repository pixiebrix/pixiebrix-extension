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

import { tokenize, serialize, deserialize } from "./TemplateEditorUtils";

describe("tokenize", () => {
  test("tokenize template expression", () => {
    const actual = tokenize("Hello, {{ @person.firstName }}!");

    expect(actual).toEqual([
      "Hello, ",
      { type: "variable", text: "{{ @person.firstName }}" },
      "!",
    ]);
  });
});

describe("deserialize/serialize", () => {
  test("serialize document", () => {
    const template = "Hello, {{ @person.firstName }}!";
    const actual = deserialize(template);
    expect(actual).toEqual([
      {
        type: "paragraph",
        children: [{ text: "Hello, {{ @person.firstName }}!" }],
      },
    ]);
    expect(serialize(actual)).toEqual(template);
  });

  test("serialize multiple paragraphs", () => {
    const template =
      "Hello, {{ @person.firstName }}!\nRegards, {{ @self.firstName }}.";
    const actual = deserialize(template);
    expect(actual).toEqual([
      {
        type: "paragraph",
        children: [{ text: "Hello, {{ @person.firstName }}!" }],
      },
      {
        type: "paragraph",
        children: [{ text: "Regards, {{ @self.firstName }}." }],
      },
    ]);
    expect(serialize(actual)).toEqual(template);
  });
});
