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
import { IExtension } from "@/core";
import { useDispatch } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import {
  extensionToFormState,
  getType,
} from "@/devTools/editor/extensionPoints/adapter";
import { actions } from "@/devTools/editor/editorSlice";
import { reportError } from "@/telemetry/logging";
import { ListGroup } from "react-bootstrap";
import {
  NotAvailableIcon,
  ExtensionIcon,
} from "@/devTools/editor/sidebar/ExtensionIcons";

const InstalledEntry: React.FunctionComponent<{
  extension: IExtension;
  installedIds: string[];
  activeElement: string | null;
}> = ({ extension, installedIds, activeElement }) => {
  const dispatch = useDispatch();
  const [type] = useAsyncState(() => getType(extension), [
    extension.extensionPointId,
  ]);
  const available = installedIds?.includes(extension.extensionPointId);

  const selectInstalled = useCallback(
    async (extension: IExtension) => {
      try {
        const state = await extensionToFormState(extension);
        dispatch(actions.selectInstalled(state));
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: extension.id, error }));
      }
    },
    [dispatch]
  );

  return (
    <ListGroup.Item
      active={extension.id == activeElement}
      key={`installed-${extension.id}`}
      onClick={() => selectInstalled(extension)}
      style={{ cursor: "pointer" }}
    >
      <ExtensionIcon type={type} /> {extension.label ?? extension.id}
      {!available && (
        <span className="ml-2">
          <NotAvailableIcon />
        </span>
      )}
    </ListGroup.Item>
  );
};

export default InstalledEntry;
