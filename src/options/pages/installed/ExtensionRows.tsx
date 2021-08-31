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

import { MessageContext, ResolvedExtension } from "@/core";
import React from "react";
import CloudExtensionRow from "./CloudExtensionRow";
import InstalledExtensionRow from "./InstalledExtensionRow";
import { RemoveAction, ExportBlueprintAction } from "./installedPageTypes";
import { sortBy } from "lodash";

const ExtensionRows: React.FunctionComponent<{
  extensions: ResolvedExtension[];
  onViewLogs: (context: MessageContext) => void;
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({ extensions, onViewLogs, onRemove, onExportBlueprint }) => (
  <>
    {sortBy(
      extensions,
      (x) => (x.active ? 0 : 1),
      (x) => x.label ?? "",
      (x) => x.id
    ).map((extension) =>
      extension.active ? (
        <InstalledExtensionRow
          key={extension.id}
          extension={extension}
          onViewLogs={onViewLogs}
          onRemove={onRemove}
          onExportBlueprint={onExportBlueprint}
        />
      ) : (
        <CloudExtensionRow
          key={extension.id}
          extension={extension}
          onExportBlueprint={onExportBlueprint}
        />
      )
    )}
  </>
);

export default ExtensionRows;
