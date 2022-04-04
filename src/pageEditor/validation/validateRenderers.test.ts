/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import {
  blocksMapFactory,
  pipelineFactory,
  TEST_BLOCK_ID,
} from "@/testUtils/factories";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import validateRenderers, {
  MULTIPLE_RENDERERS_ERROR_MESSAGE,
  RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE,
} from "./validateRenderers";
import { validateRegistryId } from "@/types/helpers";
import { ExtensionPointType } from "@/extensionPoints/types";

const elementTypesToSkipValidation: ExtensionPointType[] = [
  "menuItem",
  "trigger",
  "contextMenu",
];
const elementTypesToValidate: ExtensionPointType[] = ["panel", "actionPanel"];

test.each(elementTypesToSkipValidation)(
  "skips validation for %s",
  async (elementType) => {
    const pipelineErrors: FormikErrorTree = {};
    const allBlocks = await blocksMapFactory();

    validateRenderers(
      pipelineErrors,
      pipelineFactory(),
      allBlocks,
      elementType
    );

    expect(pipelineErrors).toEqual({});
  }
);

test.each(elementTypesToValidate)(
  "successfully validates %s pipeline with one renderer",
  async (elementType) => {
    const pipelineErrors: FormikErrorTree = {};

    const allBlocks = await blocksMapFactory();
    ([...allBlocks.values()][1] as any).render = jest.fn();

    validateRenderers(
      pipelineErrors,
      pipelineFactory(),
      allBlocks,
      elementType
    );

    expect(pipelineErrors).toEqual({});
  }
);

test.each(elementTypesToValidate)(
  "reports the errors when have multiple renderers",
  async (elementType) => {
    const pipelineErrors: FormikErrorTree = {};

    const allBlocks = await blocksMapFactory({
      render: jest.fn(),
    } as unknown);

    validateRenderers(
      pipelineErrors,
      pipelineFactory(),
      allBlocks,
      elementType
    );

    expect(pipelineErrors[0]).toEqual(
      `${MULTIPLE_RENDERERS_ERROR_MESSAGE} ${RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE}`
    );
    expect(pipelineErrors[1]).toBeUndefined();
  }
);

test.each(elementTypesToValidate)(
  "reports the error when renderer is not at the end of the pipeline",
  async (elementType) => {
    const pipelineErrors: FormikErrorTree = {};

    const pipeline = pipelineFactory();
    pipeline[1].id = validateRegistryId(`${TEST_BLOCK_ID}_2`);

    const allBlocks = await blocksMapFactory({
      render: jest.fn(),
    } as unknown);

    validateRenderers(pipelineErrors, pipeline, allBlocks, elementType);

    expect(pipelineErrors[0]).toEqual(
      RENDERER_MUST_BE_LAST_BLOCK_ERROR_MESSAGE
    );
    expect(pipelineErrors[1]).toBeUndefined();
  }
);
