/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback } from "react";
import { actions, FormState } from "@/devTools/editor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import { ListGroup } from "react-bootstrap";
import { getLabel } from "@/devTools/editor/sidebar/common";
import {
  ExtensionIcon,
  NotAvailableIcon,
  UnsavedChangesIcon,
} from "@/devTools/editor/sidebar/ExtensionIcons";
import { UUID } from "@/core";
import { disableOverlay, enableOverlay } from "@/contentScript/messenger/api";
import { thisTab } from "@/devTools/utils";

/**
 * A sidebar menu entry corresponding to an extension that is new or is currently being edited.
 * @see InstalledEntry
 */
const DynamicEntry: React.FunctionComponent<{
  item: FormState;
  available: boolean;
  activeElement: string | null;
}> = ({ item, available, activeElement }) => {
  const dispatch = useDispatch();

  const isDirty = useSelector<RootState>(
    (x) => x.editor.dirty[item.uuid] ?? false
  );

  const showOverlay = useCallback(async (uuid: UUID) => {
    await enableOverlay(thisTab, `[data-uuid="${uuid}"]`);
  }, []);

  const hideOverlay = useCallback(async () => {
    await disableOverlay(thisTab);
  }, []);

  return (
    <ListGroup.Item
      action
      active={item.uuid === activeElement}
      key={`dynamic-${item.uuid}`}
      onMouseEnter={async () => showOverlay(item.uuid)}
      onMouseLeave={async () => hideOverlay()}
      onClick={() => dispatch(actions.selectElement(item.uuid))}
    >
      <ExtensionIcon type={item.type} /> {getLabel(item)}
      {!available && (
        <span className="ml-2">
          <NotAvailableIcon />
        </span>
      )}
      {isDirty && (
        <span className="text-danger ml-2">
          <UnsavedChangesIcon />
        </span>
      )}
    </ListGroup.Item>
  );
};

export default DynamicEntry;
