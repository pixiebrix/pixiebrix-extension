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

import { toExpression } from "../../../utils/expressionUtils";
import useDuplicateElement from "./useDuplicateElement";
import { renderHook } from "../../testHelpers";
import { actions } from "../../store/editor/editorSlice";
import { formStateFactory } from "../../../testUtils/factories/pageEditorFactories";
import { autoUUIDSequence } from "../../../testUtils/factories/stringFactories";
import { type BrickConfig } from "@/bricks/types";
import { validateRegistryId } from "../../../types/helpers";

const staticDocumentConfig: BrickConfig = {
  id: validateRegistryId("@pixiebrix/document"),
  instanceId: autoUUIDSequence(),
  config: {
    body: [
      {
        type: "container",
        config: {},
        children: [
          {
            type: "row",
            config: {},
            children: [
              {
                type: "column",
                config: {},
                children: [
                  {
                    type: "header_1",
                    config: {
                      title: toExpression("nunjucks", "Sidebar"),
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const dynamicDocumentConfig: BrickConfig = {
  id: validateRegistryId("@pixiebrix/document"),
  instanceId: autoUUIDSequence(),
  config: {
    body: [
      {
        type: "container",
        config: {},
        children: [
          {
            type: "row",
            config: {},
            children: [
              {
                type: "column",
                config: {},
                children: [
                  {
                    type: "block",
                    config: {
                      pipeline: toExpression("pipeline", [
                        {
                          id: validateRegistryId("@pixiebrix/text"),
                          instanceId: autoUUIDSequence(),
                        } as BrickConfig,
                      ]),
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("useDuplicateElement", () => {
  it("duplicates static element", async () => {
    const formState = formStateFactory({
      brickPipeline: [staticDocumentConfig],
    });

    const wrapper = renderHook(
      () => useDuplicateElement("modComponent.brickPipeline.0.config"),
      {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(actions.addModComponentFormState(formState));
          dispatch(actions.setActiveModComponentId(formState.uuid));

          dispatch(
            actions.setActiveNodeId(
              formState.modComponent.brickPipeline[0]!.instanceId!,
            ),
          );
        },
      },
    );

    await wrapper.act(async () => {
      await wrapper.result.current("body.0.children.0.children.0.children.0");
    });

    const container =
      wrapper.getFormState()!.modComponent.brickPipeline[0].config.body[0]
        .children[0].children[0];
    expect(container.children).toHaveLength(2);
    // Should be exactly the same since there's no brickInstanceIds to re-assign
    expect(container.children[0]).toEqual(container.children[1]);
  });

  it("duplicates dynamic element", async () => {
    const formState = formStateFactory({
      brickPipeline: [dynamicDocumentConfig],
    });

    const wrapper = renderHook(
      () => useDuplicateElement("modComponent.brickPipeline.0.config"),
      {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(actions.addModComponentFormState(formState));
          dispatch(actions.setActiveModComponentId(formState.uuid));
          dispatch(
            actions.setActiveNodeId(
              formState.modComponent.brickPipeline[0]!.instanceId!,
            ),
          );
        },
      },
    );

    await wrapper.act(async () => {
      await wrapper.result.current("body.0.children.0.children.0.children.0");
    });

    const container =
      wrapper.getFormState()!.modComponent.brickPipeline[0].config.body[0]
        .children[0].children[0];
    expect(container.children).toHaveLength(2);

    const getInstanceId = (element: any) =>
      element.config.pipeline.__value__[0].instanceId;

    // Should generate a new instance id
    expect(getInstanceId(container.children[0])).not.toEqual(
      getInstanceId(container.children[1]),
    );
  });
});
