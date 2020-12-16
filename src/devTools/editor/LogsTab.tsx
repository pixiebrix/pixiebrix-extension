/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import { FormState } from "@/devTools/editor/editorSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { Tab } from "react-bootstrap";
import RunLogCard from "@/options/pages/extensionEditor/RunLogCard";

const LogsTab: React.FunctionComponent<{
  element: FormState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ element }) => {
  return (
    <Tab.Pane eventKey="logs" className="h-100">
      <RunLogCard
        extensionPointId={element.extensionPoint.metadata.id}
        extensionId={element.uuid}
      />
    </Tab.Pane>
  );
};

export default LogsTab;
