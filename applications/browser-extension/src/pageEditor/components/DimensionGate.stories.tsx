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
import { type ComponentStory, type ComponentMeta } from "@storybook/react";
import { GatePanel } from "./DimensionGate";
import { editorSlice } from "../store/editor/editorSlice";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

export default {
  title: "PageEditor/DimensionGatePanel",
  component: GatePanel,
  parameters: {
    // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/6962
    storyshots: false,
  },
} as ComponentMeta<typeof GatePanel>;

function optionsStore() {
  return configureStore({
    reducer: {
      editor: editorSlice.reducer,
    },
  });
}

const Template: ComponentStory<typeof GatePanel> = (args) => (
  <Provider store={optionsStore()}>
    <div style={{ width: 500, height: 600 }}>
      <GatePanel {...args} />
    </div>
  </Provider>
);

export const DimensionGatePanel = Template.bind({});
DimensionGatePanel.args = {};
