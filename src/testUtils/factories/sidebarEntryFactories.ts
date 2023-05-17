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

import { define, type FactoryConfig } from "cooky-cutter";
import {
  type ActivateRecipeEntry,
  type EntryType,
  type FormEntry,
  type PanelEntry,
  type SidebarEntry,
  type StaticPanelEntry,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type FormDefinition } from "@/blocks/transformers/ephemeralForm/formTypes";

const activateRecipeEntryFactory = define<ActivateRecipeEntry>({
  type: "activateRecipe",
  recipeId: (n: number) =>
    validateRegistryId(`@test/activate-recipe-test-${n}`),
  heading: (n: number) => `Activate Recipe Test ${n}`,
});
const staticPanelEntryFactory = define<StaticPanelEntry>({
  type: "staticPanel",
  heading: (n: number) => `Static Panel ${n}`,
  key: (n: number) => `static-panel-${n}`,
  body: null,
});
const formDefinitionFactory = define<FormDefinition>({
  schema: () => ({}),
  uiSchema: () => ({}),
  cancelable: true,
  submitCaption: "Submit",
});
export const formEntryFactory = define<FormEntry>({
  type: "form",
  extensionId: uuidSequence,
  nonce: uuidSequence,
  form: formDefinitionFactory,
});
const temporaryPanelEntryFactory = define<TemporaryPanelEntry>({
  type: "temporaryPanel",
  extensionId: uuidSequence,
  blueprintId: null,
  heading: (n: number) => `Temporary Panel Test ${n}`,
  payload: null,
  nonce: uuidSequence,
});
const panelEntryFactory = define<PanelEntry>({
  type: "panel",
  extensionId: uuidSequence,
  blueprintId: (n: number) =>
    validateRegistryId(`@test/panel-recipe-test-${n}`),
  heading: (n: number) => `Panel Test ${n}`,
  payload: null,
  extensionPointId: (n: number) =>
    validateRegistryId(`@test/panel-extensionPoint-test-${n}`),
});

export function sidebarEntryFactory(
  type: "panel",
  override?: FactoryConfig<PanelEntry>
): PanelEntry;
export function sidebarEntryFactory(
  type: "temporaryPanel",
  override?: FactoryConfig<TemporaryPanelEntry>
): TemporaryPanelEntry;
export function sidebarEntryFactory(
  type: "form",
  override?: FactoryConfig<FormEntry>
): FormEntry;
export function sidebarEntryFactory(
  type: "activateRecipe",
  override?: FactoryConfig<ActivateRecipeEntry>
): ActivateRecipeEntry;

export function sidebarEntryFactory(
  type: "staticPanel",
  override?: FactoryConfig<StaticPanelEntry>
): StaticPanelEntry;
export function sidebarEntryFactory(
  type: EntryType,
  override?: FactoryConfig<SidebarEntry>
): SidebarEntry {
  if (type === "activateRecipe") {
    return activateRecipeEntryFactory(
      override as FactoryConfig<ActivateRecipeEntry>
    );
  }

  if (type === "form") {
    return formEntryFactory(override as FactoryConfig<FormEntry>);
  }

  if (type === "temporaryPanel") {
    return temporaryPanelEntryFactory(
      override as FactoryConfig<TemporaryPanelEntry>
    );
  }

  if (type === "panel") {
    return panelEntryFactory(override as FactoryConfig<PanelEntry>);
  }

  if (type === "staticPanel") {
    return staticPanelEntryFactory(override as FactoryConfig<StaticPanelEntry>);
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- allow never, future-proof for new types
  throw new Error(`Unknown entry type: ${type}`);
}
