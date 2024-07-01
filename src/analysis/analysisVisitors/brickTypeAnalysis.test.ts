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

import BrickTypeAnalysis from "@/analysis/analysisVisitors/brickTypeAnalysis";
import brickRegistry from "@/bricks/registry";
import CommentEffect from "@/bricks/effects/comment";
import { sidebarPanelFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { createNewConfiguredBrick } from "@/pageEditor/exampleBrickConfigs";
import { DocumentRenderer } from "@/bricks/renderers/document";
import CancelEffect from "@/bricks/effects/CancelEffect";
import { ALERT_EFFECT_ID, AlertEffect } from "@/bricks/effects/alert";
import { ErrorEffect } from "@/bricks/effects/error";

beforeAll(() => {
  brickRegistry.register([
    new CommentEffect(),
    new DocumentRenderer(),
    new CancelEffect(),
    new AlertEffect(),
  ]);
});

describe("BrickTypeAnalysis", () => {
  test("disallow effect in renderer", async () => {
    const formState = sidebarPanelFormStateFactory();

    formState.modComponent.brickPipeline = [
      createNewConfiguredBrick(ALERT_EFFECT_ID),
      createNewConfiguredBrick(DocumentRenderer.BRICK_ID),
    ];

    const analysis = new BrickTypeAnalysis();

    await analysis.run(formState);

    expect(analysis.getAnnotations()).toHaveLength(1);
  });

  test.each([
    CommentEffect.BRICK_ID,
    CancelEffect.BRICK_ID,
    ErrorEffect.BRICK_ID,
  ])("allow %s in renderer", async (brickId) => {
    const formState = sidebarPanelFormStateFactory();

    formState.modComponent.brickPipeline = [
      createNewConfiguredBrick(brickId),
      createNewConfiguredBrick(DocumentRenderer.BRICK_ID),
    ];

    const analysis = new BrickTypeAnalysis();

    await analysis.run(formState);

    expect(analysis.getAnnotations()).toHaveLength(0);
  });
});
