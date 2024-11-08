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

import { formStateFactory } from "../../../testUtils/factories/pageEditorFactories";
import { GetPageState, SetPageState } from "@/bricks/effects/pageState";
import PageStateAnalysis from "./pageStateAnalysis";
import { AnnotationType } from "../../../types/annotationTypes";
import { registryIdFactory } from "../../../testUtils/factories/stringFactories";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { type BaseFormState } from "../../../pageEditor/store/editor/baseFormStateTypes";

import { StateNamespaces } from "../../../platform/state/stateTypes";

describe("PageStateAnalysis", () => {
  it.each([SetPageState.BRICK_ID, GetPageState.BRICK_ID])(
    "shows info on shared page state for %s",
    async (registryId) => {
      const state = formStateFactory({
        brickPipeline: [
          {
            id: registryId,
            config: {
              namespace: "shared",
            },
          },
        ],
      });

      const analysis = new PageStateAnalysis();
      await analysis.run(state);

      expect(analysis.getAnnotations()).toEqual([
        expect.objectContaining({
          type: AnnotationType.Info,
        }),
      ]);
    },
  );

  it("shows info on shared page state for custom form", async () => {
    const state = formStateFactory({
      brickPipeline: [
        {
          id: CustomFormRenderer.BRICK_ID,
          config: {
            storage: {
              type: "state",
              namespace: "shared",
            },
          },
        },
      ],
    });

    const analysis = new PageStateAnalysis();
    await analysis.run(state);

    expect(analysis.getAnnotations()).toEqual([
      expect.objectContaining({
        type: AnnotationType.Info,
      }),
    ]);
  });

  it.each([SetPageState.BRICK_ID, GetPageState.BRICK_ID])(
    "shows no warning mod namespace for brick in mod: %s",
    async (registryId) => {
      const state = formStateFactory({
        brickPipeline: [
          {
            id: registryId,
            config: {
              namespace: StateNamespaces.MOD,
            },
          },
        ],
      });

      state.modMetadata = {
        id: registryIdFactory(),
      } as BaseFormState["modMetadata"];

      const analysis = new PageStateAnalysis();
      await analysis.run(state);

      expect(analysis.getAnnotations()).toEqual([]);
    },
  );
});
