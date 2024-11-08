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
import ModVariableSchemasVisitor from "./modVariableSchemasVisitor";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import { toExpression } from "../../../utils/expressionUtils";

beforeAll(() => {
  registerBuiltinBricks();
});

describe("ModVariableSchemasVisitor", () => {
  it("collects event schema from a template literal", async () => {
    const formState = formStateFactory();
    formState.modComponent.brickPipeline[0] = {
      id: AssignModVariable.BRICK_ID,
      config: {
        variableName: toExpression("nunjucks", "foo"),
      },
    };

    const result = ModVariableSchemasVisitor.collectSchemas([formState]);

    await expect(result).resolves.toEqual({
      knownProperties: [{ foo: true }],
    });
  });

  it("unions known schemas", async () => {
    const formState = formStateFactory();
    formState.modComponent.brickPipeline[0] = {
      id: AssignModVariable.BRICK_ID,
      config: {
        variableName: "foo",
      },
    };

    const otherFormState = formStateFactory();
    otherFormState.modComponent.brickPipeline[0] = {
      id: AssignModVariable.BRICK_ID,
      config: {
        variableName: "bar",
      },
    };

    const result = ModVariableSchemasVisitor.collectSchemas([
      formState,
      otherFormState,
    ]);

    await expect(result).resolves.toEqual({
      knownProperties: [{ foo: true }, { bar: true }],
    });
  });

  it("does not duplicate schemas", async () => {
    const formState = formStateFactory();
    formState.modComponent.brickPipeline[0] = {
      id: AssignModVariable.BRICK_ID,
      config: {
        variableName: "foo",
      },
    };

    const otherFormState = formStateFactory();
    otherFormState.modComponent.brickPipeline[0] = {
      id: AssignModVariable.BRICK_ID,
      config: {
        variableName: "foo",
      },
    };

    const result = ModVariableSchemasVisitor.collectSchemas([
      formState,
      otherFormState,
    ]);

    await expect(result).resolves.toEqual({
      knownProperties: [{ foo: true }],
    });
  });
});
