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

import React from "react";
import ModComponentActionMenu from "@/pageEditor/modListingPanel/ModComponentActionMenu";
import { type ComponentMeta, type ComponentStory } from "@storybook/react";
import { editorStore } from "@/testUtils/storyUtils";
import { Provider } from "react-redux";
import { triggerFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { getPipelineMap } from "@/pageEditor/tabs/editTab/editHelpers";
import {
  FOUNDATION_NODE_ID,
  makeInitialBrickConfigurationUIState,
} from "@/pageEditor/store/editor/uiState";

type StoryArgs = typeof ModComponentActionMenu & { isDirty: boolean };

export default {
  title: "Sidebar/ActionMenu",
  component: ModComponentActionMenu,
  argTypes: {
    isDirty: {
      control: "boolean",
      defaultValue: false,
    },
  },
} as ComponentMeta<StoryArgs>;

const Template: ComponentStory<StoryArgs> = (args: { isDirty?: boolean }) => {
  const { isDirty } = args;
  const modComponentFormState = triggerFormStateFactory();
  const store = editorStore({
    editor: {
      dirty: isDirty ? { [modComponentFormState.uuid]: true } : {},
      modComponentFormStates: [modComponentFormState],
      brickPipelineUIStateById: {
        [modComponentFormState.uuid]: {
          pipelineMap: getPipelineMap(
            modComponentFormState.modComponent.brickPipeline,
          ),
          activeNodeId:
            modComponentFormState.modComponent.brickPipeline[0]?.instanceId ??
            FOUNDATION_NODE_ID,
          nodeUIStates: {
            [FOUNDATION_NODE_ID]:
              makeInitialBrickConfigurationUIState(FOUNDATION_NODE_ID),
          },
        },
      },
    },
  });

  // Set the active mod component
  store.dispatch(actions.setActiveModComponentId(modComponentFormState.uuid));

  return (
    <div className="d-flex">
      <Provider store={store}>
        <ModComponentActionMenu
          modComponentFormState={modComponentFormState}
          labelRoot={modComponentFormState.label}
        />
      </Provider>
    </div>
  );
};

export const CleanModComponent = Template.bind({
  isDirty: false,
});

export const DirtyModComponent = Template.bind({
  isDirty: true,
});
