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

import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import brickRegistry from "@/bricks/registry";
import { AlertEffect } from "@/bricks/effects/alert";
import SearchIndexVisitor from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/searchIndexVisitor";
import type { BrickConfig } from "@/bricks/types";
import { toExpression } from "@/utils/expressionUtils";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import type { LocationRef } from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/findTypes";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { getExampleBrickConfig } from "@/bricks/exampleBrickConfigs";

const alertBrick = new AlertEffect();
const documentRendererBrick = new DocumentRenderer();

beforeAll(() => {
  brickRegistry.register([alertBrick, documentRendererBrick]);
});

describe("searchIndexVisitor", () => {
  it("indexes brick label", async () => {
    const label = "My label";
    const brickConfig = brickConfigFactory({
      id: alertBrick.id,
      label,
      config: { message: "Hello, world!" },
    });

    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    const location: LocationRef = {
      modComponentId: formState.uuid,
      breadcrumbs: [{ brickConfig, brick: alertBrick }],
    };

    await expect(
      SearchIndexVisitor.collectItems([formState]),
    ).resolves.toContainEqual({
      location,
      data: {
        brick: {
          id: alertBrick.id,
          name: alertBrick.name,
        },
        label,
      },
    });
  });

  it("indexes brick comments", async () => {
    const comments = "My comments";
    const brickConfig = brickConfigFactory({
      id: alertBrick.id,
      comments,
      config: { message: "Hello, world!" },
    });

    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    const location: LocationRef = {
      modComponentId: formState.uuid,
      breadcrumbs: [{ brickConfig, brick: alertBrick }],
    };

    await expect(
      SearchIndexVisitor.collectItems([formState]),
    ).resolves.toContainEqual({
      location,
      data: {
        brick: {
          id: alertBrick.id,
          name: alertBrick.name,
        },
        comments,
      },
    });
  });

  it("indexes literal value", async () => {
    const message = "Hello, world!";
    const brickConfig: BrickConfig = { id: alertBrick.id, config: { message } };

    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    const location: LocationRef = {
      modComponentId: formState.uuid,
      breadcrumbs: [{ brickConfig, brick: alertBrick }],
    };

    await expect(
      SearchIndexVisitor.collectItems([formState]),
    ).resolves.toContainEqual({
      location: {
        ...location,
        fieldRef: {
          prop: "message",
          schema: alertBrick.inputSchema.properties!.message,
        },
      },
      data: {
        value: message,
      },
    });
  });

  it("indexes expression value", async () => {
    const message = toExpression("nunjucks", "Hello, {{ @person }}");
    const brickConfig = brickConfigFactory({
      id: alertBrick.id,
      config: { message },
    });

    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    const location: LocationRef = {
      modComponentId: formState.uuid,
      breadcrumbs: [{ brickConfig, brick: alertBrick }],
    };

    await expect(
      SearchIndexVisitor.collectItems([formState]),
    ).resolves.toContainEqual({
      location: {
        ...location,
        fieldRef: {
          prop: "message",
          schema: alertBrick.inputSchema.properties!.message,
        },
      },
      data: {
        value: message.__value__,
      },
    });
  });

  it("indexes document builder header title", async () => {
    const brickConfig = brickConfigFactory({
      id: DocumentRenderer.BRICK_ID,
      config: getExampleBrickConfig(DocumentRenderer.BRICK_ID)!,
    });

    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    await expect(
      SearchIndexVisitor.collectItems([formState]),
    ).resolves.toContainEqual({
      location: {
        modComponentId: formState.uuid,
        breadcrumbs: [
          { brickConfig, brick: expect.toBeObject() },
          { bodyPath: "0", builderElement: expect.toBeObject() },
          { bodyPath: "0.children.0", builderElement: expect.toBeObject() },
          {
            bodyPath: "0.children.0.children.0",
            builderElement: expect.toBeObject(),
          },
          {
            bodyPath: "0.children.0.children.0.children.0",
            builderElement: expect.objectContaining({
              type: "header",
            }),
          },
        ],
        fieldRef: {
          prop: "title",
          schema: undefined,
        },
      },
      data: {
        value: "Example document",
      },
    });
  });
});
