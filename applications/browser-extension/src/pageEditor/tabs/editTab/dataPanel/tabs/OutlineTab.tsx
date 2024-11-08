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

import { DataPanelTabKey } from "../dataPanelTypes";
import DataTabPane from "../DataTabPane";
import React from "react";
import DocumentOutline from "../../../../documentBuilder/outline/DocumentOutline";
import useReduxState from "../../../../../hooks/useReduxState";
import {
  selectActiveBuilderPreviewElement,
  selectActiveNodeInfo,
} from "../../../../store/editor/editorSelectors";
import { actions as editorActions } from "../../../../store/editor/editorSlice";
import { joinPathParts } from "../../../../../utils/formUtils";
import { useSelector } from "react-redux";
import useIsSidebarPanelStale from "./useIsSidebarPanelStale";
import { staleSidePanelAlertElement } from "./DesignTab";

/**
 * Document Builder Outline tab. Introduced to support re-ordering Document Builder elements.
 */
// XXX: consider making the outline a subview of the Design tab
const OutlineTab: React.FC = () => {
  const { path: brickPath } = useSelector(selectActiveNodeInfo);

  const isSidebarPanelStale = useIsSidebarPanelStale();

  const [activeBuilderPreviewElement, setActiveBuilderPreviewElement] =
    useReduxState(
      selectActiveBuilderPreviewElement,
      editorActions.setActiveBuilderPreviewElement,
    );

  const documentBodyFieldName = joinPathParts(brickPath, "config.body");

  return (
    <DataTabPane eventKey={DataPanelTabKey.Outline}>
      {isSidebarPanelStale && staleSidePanelAlertElement}
      <DocumentOutline
        documentBodyName={documentBodyFieldName}
        activeElement={activeBuilderPreviewElement}
        setActiveElement={setActiveBuilderPreviewElement}
      />
    </DataTabPane>
  );
};

export default OutlineTab;
