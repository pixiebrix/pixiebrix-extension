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

import { type ModComponentBase } from "@/types/modComponentTypes";
import arrangeSidebarItems from "@/pageEditor/modListingPanel/arrangeSidebarItems";
import {
  modComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";

// Mods
const modMetadataFoo = modMetadataFactory({
  name: "Foo Mod",
});

const modMetadataBar = modMetadataFactory({
  name: "Bar Mod",
});

// Mod Components
const cleanModComponentFooA = modComponentFactory({
  label: "A",
  modMetadata: modMetadataFoo,
});

const formStateModComponentFooA = menuItemFormStateFactory({
  uuid: cleanModComponentFooA.id,
  label: "A",
  modMetadata: modMetadataFoo,
});

const formStateModComponentFooB = menuItemFormStateFactory({
  label: "B",
  modMetadata: modMetadataFoo,
});

const cleanModComponentBarD = modComponentFactory({
  label: "D",
  modMetadata: modMetadataBar,
});

const formStateModComponentBarE = menuItemFormStateFactory({
  label: "E",
  modMetadata: modMetadataBar,
});

const cleanModComponentBarF: ModComponentBase = modComponentFactory({
  label: "F",
  modMetadata: modMetadataBar,
});

describe("arrangeSidebarItems()", () => {
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
      modComponentFormStates: [formStateModComponentFooA],
      cleanModComponents: [cleanModComponentFooA],
    });

    expect(sidebarItems).toStrictEqual([
      {
        modMetadata: modMetadataFoo,
        modComponents: [formStateModComponentFooA],
      },
    ]);
  });
});
