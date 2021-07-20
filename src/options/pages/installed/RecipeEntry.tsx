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

import React, { useCallback, useState } from "react";
import { InstalledExtension } from "@/options/selectors";
import { useToasts } from "react-toast-notifications";
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
import { ExtensionIdentifier } from "@/core";
import ExtensionRow from "@/options/pages/installed/ExtensionRow";

type RemoveAction = (identifier: ExtensionIdentifier) => void;

const RecipeEntry: React.FunctionComponent<{
  recipeId: string;
  extensions: InstalledExtension[];
  onRemove: RemoveAction;
}> = ({ recipeId, extensions, onRemove }) => {
  const [expanded, setExpanded] = useState(true);
  const { addToast } = useToasts();

  // Only consider to be a deployment if none of the extensions have been modified
  const isDeployment = extensions.every((x) => x._deployment != null);

  const removeMany = useCallback(
    async (extensions: InstalledExtension[], name: string) => {
      try {
        for (const { id: extensionId, extensionPointId } of extensions) {
          onRemove({ extensionId, extensionPointId });
        }

        addToast(`Uninstalled ${name}`, {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (error: unknown) {
        reportError(error);

        addToast(`Error uninstalling ${name}: ${getErrorMessage(error)}`, {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [addToast, onRemove]
  );

  return (
    <tbody key={recipeId}>
      {recipeId !== "" && (
        <tr
          className={cx("ActiveBricksCard__blueprint", { isDeployment })}
          onClick={() => setExpanded((prev: boolean) => !prev)}
        >
          <th>
            {!isDeployment && (
              <FontAwesomeIcon
                icon={expanded ? faCaretDown : faCaretRight}
                onClick={() => setExpanded((prev: boolean) => !prev)}
              />
            )}
          </th>
          {isDeployment ? (
            <>
              <th className="py-2">
                {extensions[0]._recipe?.name ?? recipeId}
              </th>
              <th className="py-2">
                <FontAwesomeIcon icon={faCheck} /> Managed
              </th>
            </>
          ) : (
            <th colSpan={2} className="py-2">
              {extensions[0]._recipe?.name ?? recipeId}
            </th>
          )}
          <th>
            <AsyncButton
              variant="danger"
              size="sm"
              onClick={async () =>
                removeMany(extensions, extensions[0]._recipe?.name)
              }
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
