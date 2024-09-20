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
import arrangeSidebarItems from "@/pageEditor/modListingPanel/arrangeSidebarItems";
import { type ButtonFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  modComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { buttonFormStateFactory } from "@/testUtils/factories/pageEditorFactories";

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
const formStateModComponentFooB: ButtonFormState = buttonFormStateFactory({
  uuid: ID_FOO_B,
  label: "B",
  modMetadata: modMetadataFoo,
});

const ID_ORPHAN_C = uuidv4();
const formStateModComponentOrphanC: ButtonFormState = buttonFormStateFactory({
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
const formStateModComponentBarE: ButtonFormState = buttonFormStateFactory({
  uuid: ID_BAR_E,
  label: "E",
  modMetadata: modMetadataBar,
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

const formStateModComponentOrphanH: ButtonFormState = buttonFormStateFactory({
  uuid: ID_ORPHAN_H,
  label: "H",
});

describe("arrangeSidebarItems()", () => {
  test("sort orphaned mods by metadata.name", () => {
    const sidebarItems = arrangeSidebarItems({
      modComponentFormStates: [formStateModComponentOrphanC],
      cleanModComponents: [cleanModComponentOrphanH, cleanModComponentOrphanG],
    });

    expect(sidebarItems).toStrictEqual([
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

  test("do not duplicate modComponent/modComponentFormState pairs in the results", () => {
    const sidebarItems = arrangeSidebarItems({
      modComponentFormStates: [formStateModComponentOrphanH],
      cleanModComponents: [cleanModComponentOrphanH],
    });

    expect(sidebarItems).toStrictEqual([formStateModComponentOrphanH]);
  });
});
