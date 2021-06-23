/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import React, { useCallback } from "react";
import { actions, FormState } from "@/devTools/editor/editorSlice";
import { Runtime } from "webextension-polyfill-ts";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import * as nativeOperations from "@/background/devtools";
import { ListGroup } from "react-bootstrap";
import { getLabel } from "@/devTools/editor/sidebar/common";
import {
  ExtensionIcon,
  NotAvailableIcon,
  UnsavedChangesIcon,
} from "@/devTools/editor/sidebar/ExtensionIcons";

const DynamicEntry: React.FunctionComponent<{
  item: FormState;
  port: Runtime.Port;
  available: boolean;
  activeElement: string | null;
}> = ({ port, item, available, activeElement }) => {
  const dispatch = useDispatch();

  const isDirty = useSelector<RootState>(
    (x) => x.editor.dirty[item.uuid] ?? false
  );

  const showOverlay = useCallback(
    async (uuid: string, on: boolean) => {
      await nativeOperations.toggleOverlay(port, { uuid, on });
    },
    [port]
  );

  return (
    <ListGroup.Item
      active={item.uuid == activeElement}
      key={`dynamic-${item.uuid}`}
      onMouseEnter={() => showOverlay(item.uuid, true)}
      onMouseLeave={() => showOverlay(item.uuid, false)}
      onClick={() => dispatch(actions.selectElement(item.uuid))}
      style={{ cursor: "pointer" }}
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
