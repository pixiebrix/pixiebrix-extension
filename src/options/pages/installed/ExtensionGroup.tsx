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

import React, { useContext, useMemo, useState } from "react";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faCheck,
  faList,
  faPause,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { IExtension, MessageContext, ResolvedExtension } from "@/core";
import useNotifications from "@/hooks/useNotifications";
import useExtensionPermissions from "@/options/pages/installed/useExtensionPermissions";
import useUserAction from "@/hooks/useUserAction";
import {
  ExportBlueprintAction,
  RemoveAction,
} from "@/options/pages/installed/installedPageTypes";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import styles from "./ExtensionGroup.module.scss";
import ExtensionRows from "./ExtensionRows";
import { useDispatch } from "react-redux";
import { installedPageSlice } from "./installedPageSlice";
import AuthContext from "@/auth/AuthContext";
import { Button } from "react-bootstrap";

const ExtensionGroup: React.FunctionComponent<{
  label: string;
  extensions: ResolvedExtension[];
  /**
   * True iff the group corresponds to a managed Deployment
   * @see Deployment
   * @see DeploymentContext
   */
  managed?: boolean;
  /**
   * True if the extension group is temporarily disabled. (Currently only deployments can be disabled without
   * uninstalling them).
   */
  paused?: boolean;
  hasUpdate?: boolean;
  startExpanded?: boolean;
  groupMessageContext: MessageContext;
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({
  label,
  extensions,
  managed = false,
  paused = false,
  startExpanded,
  groupMessageContext,
  onRemove,
  onExportBlueprint,
  hasUpdate,
}) => {
  const { flags } = useContext(AuthContext);
  const notify = useNotifications();
  const dispatch = useDispatch();

  const expandable = !managed;
  const [expanded, setExpanded] = useState(expandable && startExpanded);

  const [hasPermissions, requestPermissions] = useExtensionPermissions(
    extensions
  );

  const removeMany = useUserAction(
    async (extensions: IExtension[]) => {
      for (const { id: extensionId } of extensions) {
        onRemove({ extensionId });
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

    if (hasUpdate) {
      return (
        <Button variant="info" size="sm">
          Update
        </Button>
      );
    }

    if (paused) {
      return (
        <>
          <FontAwesomeIcon icon={faPause} /> Paused
        </>
      );
    }

    if (managed) {
      return (
        <>
          <FontAwesomeIcon icon={faCheck} /> Managed
        </>
      );
    }

    // XXX: this should check the status of the underlying bricks and surface if there's any problems (because the
    // groups start collapsed, you wouldn't know where to look)
    return (
      <>
        <FontAwesomeIcon icon={faCheck} /> Active
      </>
    );
  }, [paused, managed, hasPermissions, requestPermissions]);

  const onViewLogs = () => {
    dispatch(
      installedPageSlice.actions.setLogsContext({
        title: label,
        messageContext: groupMessageContext,
      })
    );
  };

  return (
    <>
      <tr
        className={cx({ [styles.expandableGroupLabel]: expandable })}
        onClick={() => {
          if (!expandable) {
            return;
          }

          setExpanded((prev: boolean) => !prev);
        }}
      >
        <td>
          {expandable && (
            <FontAwesomeIcon icon={expanded ? faCaretDown : faCaretRight} />
          )}
        </td>
        <td>{label}</td>
        <td>{status}</td>
        <td>
          <EllipsisMenu
            items={[
              {
                title: (
                  <>
                    <FontAwesomeIcon icon={faList} /> View Logs
                  </>
                ),
                action: onViewLogs,
              },
              {
                title: (
                  <>
                    <FontAwesomeIcon icon={faTimes} /> Uninstall
                  </>
                ),
                // #1532: temporary approach to controlling whether or not deployments can be uninstalled. In
                // the future we'll want this to depend on the member's role within the deployment's organization
                hide: managed && flags.includes("restricted-uninstall"),
                action: async () => {
                  await removeMany(extensions);
                },
                className: "text-danger",
              },
            ]}
          />
        </td>
      </tr>
      {expanded && expandable && (
        <ExtensionRows
          extensions={extensions}
          onRemove={onRemove}
          onExportBlueprint={onExportBlueprint}
        />
      )}
    </>
  );
};

export default ExtensionGroup;
