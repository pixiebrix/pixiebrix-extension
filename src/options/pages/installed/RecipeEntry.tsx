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

import React, { useCallback, useMemo, useState } from "react";
import { reportError } from "@/telemetry/logging";
import { getErrorMessage } from "@/errors";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { ExtensionIdentifier, IExtension } from "@/core";
import ExtensionRow from "@/options/pages/installed/ExtensionRow";
import useNotifications from "@/hooks/useNotifications";
import useExtensionPermissions from "@/options/pages/installed/useExtensionPermissions";

type RemoveAction = (identifier: ExtensionIdentifier) => void;

const RecipeEntry: React.FunctionComponent<{
  recipeId: string;
  extensions: IExtension[];
  onRemove: RemoveAction;
}> = ({ recipeId, extensions, onRemove }) => {
  const notify = useNotifications();
  const [expanded, setExpanded] = useState(true);

  // Only consider to be a deployment if none of the extensions have been modified
  const isDeployment = extensions.every((x) => x._deployment != null);

  const [hasPermissions, requestPermissions] = useExtensionPermissions(
    extensions
  );

  const removeMany = useCallback(
    async (extensions: IExtension[], name: string) => {
      try {
        for (const { id: extensionId, extensionPointId } of extensions) {
          onRemove({ extensionId, extensionPointId });
        }

        notify.success(`Uninstalled ${name}`);
      } catch (error: unknown) {
        reportError(error);
        notify.error(`Error uninstalling ${name}: ${getErrorMessage(error)}`, {
          error,
        });
      }
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

    if (isDeployment) {
      return (
        <>
          <FontAwesomeIcon icon={faCheck} /> Managed
        </>
      );
    }

    return null;
  }, [isDeployment, hasPermissions, requestPermissions]);

  const recipe = extensions[0]._recipe;
  const label = recipe?.name ?? recipeId;

  return (
    <tbody key={recipeId}>
      {recipeId !== "" && (
        <tr
          className={cx("ActiveBricksCard__blueprint", { isDeployment })}
          onClick={() => {
            setExpanded((prev: boolean) => !prev);
          }}
        >
          <th>
            {!isDeployment && (
              // Deployments cannot be expanded
              <FontAwesomeIcon
                icon={expanded ? faCaretDown : faCaretRight}
                onClick={() => {
                  setExpanded((prev: boolean) => !prev);
                }}
              />
            )}
          </th>
          <th className="py-2">{label}</th>
          <th className="py-2">{status}</th>
          <th>
            <AsyncButton
              variant="danger"
              size="sm"
              onClick={async () => removeMany(extensions, recipe?.name)}
            >
              Uninstall
            </AsyncButton>
          </th>
        </tr>
      )}
      {expanded &&
        !isDeployment &&
        extensions.map((extension) => (
          <ExtensionRow
            key={extension.id}
            extension={extension}
            onRemove={onRemove}
          />
        ))}
    </tbody>
  );
};

export default RecipeEntry;
