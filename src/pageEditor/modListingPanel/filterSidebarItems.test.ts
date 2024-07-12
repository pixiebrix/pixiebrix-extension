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

import { define } from "cooky-cutter";
import { type SidebarItem } from "@/pageEditor/modListingPanel/common";
import {
  modComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import filterSidebarItems from "@/pageEditor/modListingPanel/filterSidebarItems";
import { validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";

const modSidebarItemFactory = define<SidebarItem>({
  modMetadata: modMetadataFactory,
  modComponents() {
    return [modComponentFactory(), formStateFactory()];
  },
});

describe("filterSidebarItems", () => {
  it("returns empty array when sidebar items is empty", () => {
    expect(
      filterSidebarItems({
        sidebarItems: [],
        filterText: "",
        activeModId: null,
        activeModComponentId: null,
      }),
    ).toEqual([]);
  });

  it("returns sidebar items when filter text is empty", () => {
    const sidebarItems = [
      modSidebarItemFactory(),
      modSidebarItemFactory(),
      formStateFactory(),
      modComponentFactory(),
    ];
    expect(
      filterSidebarItems({
        sidebarItems,
        filterText: "",
        activeModId: null,
        activeModComponentId: null,
      }),
    ).toEqual(sidebarItems);
  });

  it("returns sidebar items when filter text matches mod name", () => {
    const sidebarItems = [
      modSidebarItemFactory({
        modMetadata: modMetadataFactory({ name: "Foo" }),
      }),
      modSidebarItemFactory({
        modMetadata: modMetadataFactory({ name: "Bar" }),
      }),
    ];
    expect(
      filterSidebarItems({
        sidebarItems,
        filterText: "fOo",
        activeModId: null,
        activeModComponentId: null,
      }),
    ).toEqual([sidebarItems[0]]);
  });

  it("returns sidebar items when filter text matches mod label", () => {
    const sidebarItems = [
      modComponentFactory({ label: "fOo" }),
      modSidebarItemFactory({
        modMetadata: modMetadataFactory({ name: "Bar" }),
      }),
    ];
    expect(
      filterSidebarItems({
        sidebarItems,
        filterText: "fOo",
        activeModId: null,
        activeModComponentId: null,
      }),
    ).toEqual([sidebarItems[0]]);
  });

  it("returns sidebar items when filter text matches mod component label", () => {
    const sidebarItems = [
      modSidebarItemFactory({
        modComponents: [
          modComponentFactory({ label: "Foo" }),
          modComponentFactory({ label: "Bar" }),
          formStateFactory({
            formStateOverride: { label: "foo" },
          }),
        ],
      }),
    ];
    expect(
      filterSidebarItems({
        sidebarItems,
        filterText: "fOo",
        activeModId: null,
        activeModComponentId: null,
      }),
    ).toEqual([sidebarItems[0], sidebarItems[2]]);
  });

  it("does not filter out active mod", () => {
    const testModId = validateRegistryId("test/foo");
    const sidebarItems = [
      modSidebarItemFactory({
        modMetadata: modMetadataFactory({ id: testModId }),
      }),
    ];
    expect(
      filterSidebarItems({
        sidebarItems,
        filterText: "abc",
        activeModId: testModId,
        activeModComponentId: null,
      }),
    ).toEqual(sidebarItems);
  });

  it("does not filter out active mod component", () => {
    const testModComponentId = uuidSequence(1);
    const sidebarItems = [
      modSidebarItemFactory({
        modComponents: [modComponentFactory({ id: testModComponentId })],
      }),
    ];
    expect(
      filterSidebarItems({
        sidebarItems,
        filterText: "abc",
        activeModId: null,
        activeModComponentId: testModComponentId,
      }),
    ).toEqual(sidebarItems);
  });
});
