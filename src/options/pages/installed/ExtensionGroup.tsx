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

import React, { useMemo, useState } from "react";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faCheck,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { IExtension, ResolvedExtension } from "@/core";
import ExtensionRow from "@/options/pages/installed/ExtensionRow";
import useNotifications from "@/hooks/useNotifications";
import useExtensionPermissions from "@/options/pages/installed/useExtensionPermissions";
import useUserAction from "@/hooks/useUserAction";
import {
  ExportBlueprintAction,
  RemoveAction,
} from "@/options/pages/installed/installedPageTypes";
import CloudExtensionRow from "@/options/pages/installed/CloudExtensionRow";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";

const ExtensionGroup: React.FunctionComponent<{
  label: string;
  extensions: ResolvedExtension[];
  managed?: boolean;
  startExpanded?: boolean;
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({
  label,
  extensions,
  managed,
  startExpanded,
  onRemove,
  onExportBlueprint,
}) => {
  const notify = useNotifications();

  const expandable = !managed;
  const [expanded, setExpanded] = useState(expandable && startExpanded);

  const [hasPermissions, requestPermissions] = useExtensionPermissions(
    extensions
  );

  const removeMany = useUserAction(
    async (extensions: IExtension[]) => {
      for (const { id: extensionId, extensionPointId } of extensions) {
        onRemove({ extensionId, extensionPointId });
      }
    },
    {
      successMessage: `Uninstalled ${label}`,
      errorMessage: `Error uninstalling ${label}`,
    },
    [notify, onRemove]
  );

  const status = useMemo(() => {
    if (!hasPermissions) {
      return (
        <AsyncButton
          variant="info"
          size="sm"
          onClick={async () => {
            await requestPermissions();
          }}
        >
          Grant Permissions
        </AsyncButton>
      );
    }

    if (managed) {
      return (
        <>
          <FontAwesomeIcon icon={faCheck} /> Managed
        </>
      );
    }

    return null;
  }, [managed, hasPermissions, requestPermissions]);

  return (
    <tbody>
      <tr
        className={cx("ActiveBricksCard__blueprint", { expandable })}
        onClick={() => {
          if (!expandable) {
            return;
          }

          setExpanded((prev: boolean) => !prev);
        }}
      >
        <th>
          {expandable && (
            <FontAwesomeIcon icon={expanded ? faCaretDown : faCaretRight} />
          )}
        </th>
        <th className="py-2">{label}</th>
        <th className="py-2">{status}</th>
        <th>
          <EllipsisMenu
            items={[
              {
                title: (
                  <>
                    <FontAwesomeIcon icon={faTimes} /> Uninstall
                  </>
                ),
                action: async () => {
                  await removeMany(extensions);
                },
                className: "text-danger",
              },
            ]}
          />
        </th>
      </tr>
      {expanded &&
        expandable &&
        extensions.map((extension) =>
          extension.active ? (
            <ExtensionRow
              key={extension.id}
              extension={extension}
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
    </tbody>
  );
};

export default ExtensionGroup;
