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

import deactivateMod from "@/background/utils/deactivateMod";
import { getEditorState } from "@/store/editorStorage";
import {
  saveModComponentState,
  getModComponentState,
} from "@/store/modComponents/modComponentStorage";
import {
  modMetadataFactory,
  activatedModComponentFactory,
} from "@/testUtils/factories/modComponentFactories";
import { starterBrickDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";

describe("deactivateMod", () => {
  let modToDeactivate: ActivatedModComponent["_recipe"];

  beforeEach(async () => {
    modToDeactivate = modMetadataFactory({});
    const anotherMod = modMetadataFactory({});

    await saveModComponentState({
      activatedModComponents: [
        activatedModComponentFactory({
          _recipe: modToDeactivate,
        }),
        activatedModComponentFactory({
          _recipe: modToDeactivate,
        }),
        activatedModComponentFactory({
          _recipe: anotherMod,
        }),
      ],
    });
  });

  it("should remove the mod components from the options state", async () => {
    const modComponentState = await getModComponentState();
    const editorState = await getEditorState();

    const {
      modComponentState: nextModComponentState,
      deactivatedModComponents,
    } = deactivateMod(modToDeactivate!.id, {
      modComponentState,
      editorState,
    });

    expect(deactivatedModComponents).toHaveLength(2);
    expect(deactivatedModComponents[0]!._recipe!.id).toEqual(
      modToDeactivate!.id,
    );
    expect(deactivatedModComponents[1]!._recipe!.id).toEqual(
      modToDeactivate!.id,
    );

    expect(nextModComponentState.activatedModComponents).toHaveLength(1);
  });

  it("should do nothing if mod id does not have any activated mod components", async () => {
    const starterBrick = starterBrickDefinitionFactory();
    const modComponent = activatedModComponentFactory({
      extensionPointId: starterBrick.metadata!.id,
      _recipe: modMetadataFactory({}),
    });

    await saveModComponentState({
      activatedModComponents: [modComponent],
    });

    const modComponentState = await getModComponentState();
    const editorState = await getEditorState();

    const {
      modComponentState: nextModComponentState,
      deactivatedModComponents,
    } = deactivateMod("@test/id-doesnt-exist" as RegistryId, {
      modComponentState,
      editorState,
    });

    expect(deactivatedModComponents).toEqual([]);
    expect(nextModComponentState.activatedModComponents).toEqual(
      modComponentState.activatedModComponents,
    );
  });
});
