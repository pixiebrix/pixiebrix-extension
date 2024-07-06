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

import { define, type FactoryConfig } from "cooky-cutter";
import {
  type EntryType,
  type FormPanelEntry,
  type ModActivationPanelEntry,
  type PanelEntry,
  type SidebarEntry,
  type StaticPanelEntry,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import { validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type FormDefinition } from "@/platform/forms/formTypes";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";

const activateModPanelEntryFactory = define<ModActivationPanelEntry>({
  type: "activateMods",
  mods: (n: number) => [
    {
      modId: validateRegistryId(`@test/activate-mods-test-${n}`),
      initialOptions: {},
    },
  ],
  heading: (n: number) => `Activate Mods Test ${n}`,
});
const staticPanelEntryFactory = define<StaticPanelEntry>({
  type: "staticPanel",
  heading: (n: number) => `Static Panel ${n}`,
  key: (n: number) => `static-panel-${n}`,
});
const formDefinitionFactory = define<FormDefinition>({
  schema: () => ({
    title: "Form Panel Test",
  }),
  uiSchema: () => ({}),
  cancelable: true,
  submitCaption: "Submit",
  location: "modal",
});
export const formEntryFactory = define<FormPanelEntry>({
  type: "form",
  modComponentRef: modComponentRefFactory,
  nonce: uuidSequence,
  form: formDefinitionFactory,
});
const temporaryPanelEntryFactory = define<TemporaryPanelEntry>({
  type: "temporaryPanel",
  modComponentRef: modComponentRefFactory,
  heading: (n: number) => `Temporary Panel Test ${n}`,
  payload: null,
  nonce: uuidSequence,
});
const panelEntryFactory = define<PanelEntry>({
  type: "panel",
  modComponentRef: modComponentRefFactory,
  heading: (n: number) => `Panel Test ${n}`,
  payload: null,
});
export function sidebarEntryFactory<T = PanelEntry>(
  type: "panel",
  override?: FactoryConfig<T>,
): PanelEntry;
export function sidebarEntryFactory<T = TemporaryPanelEntry>(
  type: "temporaryPanel",
  override?: FactoryConfig<T>,
): TemporaryPanelEntry;
export function sidebarEntryFactory<T = FormPanelEntry>(
  type: "form",
  override?: FactoryConfig<T>,
): FormPanelEntry;
export function sidebarEntryFactory<T = ModActivationPanelEntry>(
  type: "activateMods",
  override?: FactoryConfig<T>,
): ModActivationPanelEntry;
export function sidebarEntryFactory<T = StaticPanelEntry>(
  type: "staticPanel",
  override?: FactoryConfig<T>,
): StaticPanelEntry;
export function sidebarEntryFactory<T = SidebarEntry>(
  type: EntryType,
  override?: FactoryConfig<T>,
): SidebarEntry {
  if (type === "activateMods") {
    return activateModPanelEntryFactory(
      override as FactoryConfig<ModActivationPanelEntry>,
    );
  }

  if (type === "form") {
    return formEntryFactory(override as FactoryConfig<FormPanelEntry>);
  }

  if (type === "temporaryPanel") {
    return temporaryPanelEntryFactory(
      override as FactoryConfig<TemporaryPanelEntry>,
    );
  }

  if (type === "panel") {
    return panelEntryFactory(override as FactoryConfig<PanelEntry>);
  }

  if (type === "staticPanel") {
    return staticPanelEntryFactory(override as FactoryConfig<StaticPanelEntry>);
  }

  const exhaustiveCheck: never = type;
  throw new Error(`Unknown entry type: ${exhaustiveCheck}`);
}
