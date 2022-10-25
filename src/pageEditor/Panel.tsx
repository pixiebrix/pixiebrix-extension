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

import React from "react";
import store from "./store";
import { Provider } from "react-redux";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import registerEditors from "@/contrib/editors";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import useRefresh from "@/hooks/useRefresh";
import PanelContent from "@/pageEditor/PanelContent";
import { logActions } from "@/components/logViewer/logSlice";

// Register the built-in bricks
registerEditors();
registerContribBlocks();
registerBuiltinBlocks();

// Register Widgets
registerDefaultWidgets();

void store.dispatch(logActions.pollLogs());

const Panel: React.VoidFunctionComponent = () => {
  // Refresh the brick registry on mount
  useRefresh({ refreshOnMount: true });

  return (
    <Provider store={store}>
      <PanelContent />
    </Provider>
  );
};

export default Panel;
