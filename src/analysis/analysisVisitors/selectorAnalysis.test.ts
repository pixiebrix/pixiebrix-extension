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

import SelectorAnalysis, {
  findJQueryExtensions,
} from "@/analysis/analysisVisitors/selectorAnalysis";
import {
  menuItemFormStateFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import type { AttachMode } from "@/starterBricks/button/buttonStarterBrickTypes";
import { HighlightEffect } from "@/bricks/effects/highlight";
import brickRegistry from "@/bricks/registry";
import { JQueryReader } from "@/bricks/transformers/jquery/JQueryReader";

const highlight = new HighlightEffect();
const reader = new JQueryReader();

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([highlight, reader]);
});

describe("findJQueryExtensions", () => {
  it("finds all jQuery extensions in simple expression", () => {
    expect(findJQueryExtensions('div:contains("bar")')).toStrictEqual([
      ":contains",
    ]);
  });

  it("handles compound", () => {
    expect(
      findJQueryExtensions('div:contains("bar"), button:visible'),
    ).toStrictEqual([":contains", ":visible"]);
  });

  it("handles complex", () => {
    expect(
      findJQueryExtensions("span:has(> a:contains('submit'))"),
    ).toStrictEqual([":contains"]);
  });

  it("excludes native has", () => {
    expect(findJQueryExtensions("div:has(div.bar)")).toStrictEqual([]);
  });

  it("has some false positives :shrug:", () => {
    expect(findJQueryExtensions("a:contains(':visible'))")).toStrictEqual([
      ":contains",
      // The false positive:
      ":visible",
    ]);
  });
});

describe("SelectorAnalysis", () => {
  it.each(["watch", "once"])(
    "detects slow trigger selector for attachMode: %s",
    async (attachMode: AttachMode) => {
      const analysis = new SelectorAnalysis();

      const formState = triggerFormStateFactory();

      formState.starterBrick.definition.rootSelector = 'div:contains("foo")';
      formState.starterBrick.definition.attachMode = attachMode;

      await analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([
        {
          analysisId: "selector",
          message: expect.any(String),
          position: {
            path: "starterBrick.definition.rootSelector",
          },
          type: expect.toBeOneOf(["warning", "info"]),
        },
      ]);
    },
  );

  it("detects invalid trigger selector", async () => {
    const analysis = new SelectorAnalysis();

    const formState = triggerFormStateFactory();

    formState.starterBrick.definition.rootSelector = '!div:contains("foo")';

    await analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      {
        analysisId: "selector",
        message: expect.any(String),
        position: {
          path: "starterBrick.definition.rootSelector",
        },
        type: "error",
      },
    ]);
  });

  it.each(["watch", "once"])(
    "detects slow menu selector for attachMode: %s",
    async (attachMode: AttachMode) => {
      const analysis = new SelectorAnalysis();

      const formState = menuItemFormStateFactory();

      formState.starterBrick.definition.containerSelector =
        'div:contains("foo")';
      formState.starterBrick.definition.attachMode = attachMode;

      await analysis.run(formState);

      expect(analysis.getAnnotations()).toStrictEqual([
        {
          analysisId: "selector",
          message: expect.any(String),
          position: {
            path: "starterBrick.definition.containerSelector",
          },
          type: expect.toBeOneOf(["warning", "info"]),
        },
      ]);
    },
  );

  it("detects invalid action location selector", async () => {
    const analysis = new SelectorAnalysis();

    const formState = menuItemFormStateFactory();

    formState.starterBrick.definition.containerSelector = "!div";

    await analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      {
        analysisId: "selector",
        message: "Invalid selector.",
        position: {
          path: "starterBrick.definition.containerSelector",
        },
        type: "error",
      },
    ]);
  });

  it("detects selectors passed to highlight brick", async () => {
    const analysis = new SelectorAnalysis();

    const formState = triggerFormStateFactory();

    formState.modComponent.brickPipeline = [
      {
        id: highlight.id,
        config: {
          rootSelector: ".D232jn2921a",
          elements: [
            {
              selector: ".D232jn2921a",
            },
          ],
        },
      },
    ];

    await analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      {
        analysisId: "selector",
        message: expect.stringMatching(/Selector appears to contain generated/),
        position: {
          path: "modComponent.brickPipeline.0.config.rootSelector",
        },
        type: "warning",
      },
      {
        analysisId: "selector",
        message: expect.stringMatching(/Selector appears to contain generated/),
        position: {
          path: "modComponent.brickPipeline.0.config.elements.0.selector",
        },
        type: "warning",
      },
    ]);
  });

  it("detects selectors passed to jquery brick", async () => {
    const analysis = new SelectorAnalysis();

    const formState = triggerFormStateFactory();

    formState.modComponent.brickPipeline = [
      {
        id: reader.id,
        config: {
          selectors: {
            simple: ".D232jn2921a",
            complex: {
              selector: ".D232jn2921a",
            },
          },
        },
      },
    ];

    await analysis.run(formState);

    expect(analysis.getAnnotations()).toStrictEqual([
      {
        analysisId: "selector",
        message: expect.stringMatching(/Selector appears to contain generated/),
        position: {
          path: "modComponent.brickPipeline.0.config.selectors.simple",
        },
        type: "warning",
      },
      {
        analysisId: "selector",
        message: expect.stringMatching(/Selector appears to contain generated/),
        position: {
          path: "modComponent.brickPipeline.0.config.selectors.complex.selector",
        },
        type: "warning",
      },
    ]);
  });
});
