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

import deactivateMod from "./deactivateMod";
import { getEditorState } from "../../store/editorStorage";
import {
  saveModComponentState,
  getModComponentState,
} from "../../store/modComponents/modComponentStorage";
import {
  modMetadataFactory,
  activatedModComponentFactory,
} from "../../testUtils/factories/modComponentFactories";
import { type ModInstance } from "../../types/modInstanceTypes";
import { modInstanceFactory } from "../../testUtils/factories/modInstanceFactories";
import { mapModInstanceToActivatedModComponents } from "../../store/modComponents/modInstanceUtils";

describe("deactivateMod", () => {
  let modToDeactivate: ModInstance;

  beforeEach(async () => {
    modToDeactivate = modInstanceFactory();
    const anotherMod = modMetadataFactory();

    await saveModComponentState({
      activatedModComponents: [
        ...mapModInstanceToActivatedModComponents(modToDeactivate),
        activatedModComponentFactory({
          modMetadata: anotherMod,
        }),
      ],
    });
  });

  it("should remove the mod components from the options state", async () => {
    const modComponentState = await getModComponentState();
    const editorState = await getEditorState();

    const { modComponentState: nextModComponentState } = deactivateMod(
      modToDeactivate,
      {
        modComponentState,
        editorState,
      },
    );

    expect(nextModComponentState.activatedModComponents).toHaveLength(1);
    expect(
      nextModComponentState.activatedModComponents[0]!.modMetadata.id,
    ).not.toEqual(modToDeactivate.definition.metadata.id);
  });
});
