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

import { SessionMap, SessionValue } from "./SessionStorage";

test("SessionMap", async () => {
  const map = new SessionMap("jester", import.meta.url);
  await expect(map.get("alpha")).resolves.toBeUndefined();

  await map.set("alpha", 1);
  await expect(map.get("alpha")).resolves.toBe(1);
  await expect(map.has("alpha")).resolves.toBeTrue();

  // Other props should be left untouched
  await expect(map.get("beta")).resolves.toBeUndefined();

  await map.delete("alpha");
  await expect(map.get("alpha")).resolves.toBeUndefined();
  await expect(map.has("alpha")).resolves.toBeFalse();
});

test("SessionMap accepts undefined", async () => {
  const map = new SessionMap("jester", import.meta.url);
  await expect(map.get("alpha")).resolves.toBeUndefined();

  await map.set("alpha", 1);
  await expect(map.get("alpha")).resolves.toBe(1);
  await expect(map.has("alpha")).resolves.toBeTrue();

  // `undefined` is a type-error because it's not a JsonValue. Keeping this test just to document the current behavior.
  await map.set("alpha", undefined as unknown as string);
  await expect(map.get("alpha")).resolves.toBeUndefined();
  // SessionMap will unset the value
  await expect(map.has("alpha")).resolves.toBeFalse();
});

test("SessionValue", async () => {
  const value = new SessionValue("jester", import.meta.url);
  await expect(value.get()).resolves.toBeUndefined();

  await value.set(1);
  await expect(value.get()).resolves.toBe(1);

  await value.unset();
  await expect(value.get()).resolves.toBeUndefined();
});

test("SessionValue allows setting undefined", async () => {
  const value = new SessionValue("jester", import.meta.url);

  await value.set(1);
  await expect(value.get()).resolves.toBe(1);

  // `undefined` is a type-error because it's not a JsonValue. Keeping this test just to document the current behavior.
  await value.set(undefined as unknown as string);
  await expect(value.get()).resolves.toBeUndefined();
});
