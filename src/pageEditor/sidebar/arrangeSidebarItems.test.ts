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

import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type ModComponentBase } from "@/types/modComponentTypes";
import arrangeSidebarItems from "@/pageEditor/sidebar/arrangeSidebarItems";
import { type ActionFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  modComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";

// Mods
const ID_FOO = validateRegistryId("test/mod-foo");
const modMetadataFoo = modMetadataFactory({
  id: ID_FOO,
  name: "Foo Mod",
});

const ID_BAR = validateRegistryId("test/mod-bar");
const modMetadataBar = modMetadataFactory({
  id: ID_BAR,
  name: "Bar Mod",
});

// Mod Components
const ID_FOO_A = uuidv4();
const cleanModComponentFooA: ModComponentBase = modComponentFactory({
  id: ID_FOO_A,
  label: "A",
  _recipe: modMetadataFoo,
});

const ID_FOO_B = uuidv4();
const formStateModComponentFooB: ActionFormState = menuItemFormStateFactory({
  uuid: ID_FOO_B,
  label: "B",
  recipe: modMetadataFoo,
});

const ID_ORPHAN_C = uuidv4();
const formStateModComponentOrphanC: ActionFormState = menuItemFormStateFactory({
  uuid: ID_ORPHAN_C,
  label: "C",
});

const ID_BAR_D = uuidv4();
const cleanModComponentBarD: ModComponentBase = modComponentFactory({
  id: ID_BAR_D,
  label: "D",
  _recipe: modMetadataBar,
});

const ID_BAR_E = uuidv4();
const formStateModComponentBarE: ActionFormState = menuItemFormStateFactory({
  uuid: ID_BAR_E,
  label: "E",
  recipe: modMetadataBar,
});

const ID_BAR_F = uuidv4();
const cleanModComponentBarF: ModComponentBase = modComponentFactory({
  id: ID_BAR_F,
  label: "F",
  _recipe: modMetadataBar,
});

const ID_ORPHAN_G = uuidv4();
const cleanModComponentOrphanG: ModComponentBase = modComponentFactory({
  id: ID_ORPHAN_G,
  label: "G",
});

const ID_ORPHAN_H = uuidv4();
const cleanModComponentOrphanH: ModComponentBase = modComponentFactory({
  id: ID_ORPHAN_H,
  label: "H",
});

const formStateModComponentOrphanH: ActionFormState = menuItemFormStateFactory({
  uuid: ID_ORPHAN_H,
  label: "H",
});

describe("arrangeSidebarItems()", () => {
  test("sort orphaned mods by metadata.name", () => {
    const elements = arrangeSidebarItems({
      modComponentFormStates: [formStateModComponentOrphanC],
      cleanModComponents: [cleanModComponentOrphanH, cleanModComponentOrphanG],
    });

    expect(elements).toStrictEqual([
      formStateModComponentOrphanC,
      cleanModComponentOrphanG,
      cleanModComponentOrphanH,
    ]);
  });

  test("groups mods and sorts mod components by label", () => {
    const sidebarItems = arrangeSidebarItems({
      modComponentFormStates: [
        formStateModComponentBarE,
        formStateModComponentFooB,
      ],
      cleanModComponents: [
        cleanModComponentFooA,
        cleanModComponentBarF,
        cleanModComponentBarD,
      ],
    });

    expect(sidebarItems).toEqual([
      {
        modMetadata: modMetadataBar,
        modComponents: [
          cleanModComponentBarD,
          formStateModComponentBarE,
          cleanModComponentBarF,
        ],
      },
      {
        modMetadata: modMetadataFoo,
        modComponents: [cleanModComponentFooA, formStateModComponentFooB],
      },
    ]);
  });

  test("do not duplicate extension/element pairs in the results", () => {
    const elements = arrangeSidebarItems({
      modComponentFormStates: [formStateModComponentOrphanH],
      cleanModComponents: [cleanModComponentOrphanH],
    });

    expect(elements).toStrictEqual([formStateModComponentOrphanH]);
  });
});
