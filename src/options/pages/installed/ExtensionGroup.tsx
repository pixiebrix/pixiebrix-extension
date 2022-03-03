/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import styles from "./ExtensionGroup.module.scss";

import React, { useCallback, useMemo, useState } from "react";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faCheck,
  faList,
  faPause,
  faShare,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { IExtension, MessageContext, ResolvedExtension } from "@/core";
import useExtensionPermissions from "@/options/pages/installed/useExtensionPermissions";
import useUserAction from "@/hooks/useUserAction";
import {
  ExportBlueprintAction,
  RemoveAction,
} from "@/options/pages/installed/installedPageTypes";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import ExtensionRows from "./ExtensionRows";
import { useDispatch } from "react-redux";
import { installedPageSlice } from "./installedPageSlice";
import { Button } from "react-bootstrap";
import { useHistory } from "react-router";
import useFlags from "@/hooks/useFlags";

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
  /**
   * True if an update is available for the recipe
   */
  hasUpdate: boolean;
  startExpanded?: boolean;
  groupMessageContext: MessageContext;
  onShare?: () => void;
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({
  label,
  extensions,
  managed = false,
  paused = false,
  startExpanded,
  groupMessageContext,
  onShare,
  onRemove,
  onExportBlueprint,
  hasUpdate,
}) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const { restrict } = useFlags();

  const expandable = !managed;
  const [expanded, setExpanded] = useState(expandable && startExpanded);

  const [hasPermissions, requestPermissions] =
    useExtensionPermissions(extensions);

  const sourceRecipeMeta = extensions[0]._recipe;

  const reinstall = useCallback(() => {
    history.push(
      `marketplace/activate/${encodeURIComponent(
        sourceRecipeMeta.id
      )}?reinstall=1`
    );
  }, [sourceRecipeMeta.id, history]);

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
    [onRemove]
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
        <Button size="sm" variant="info" onClick={reinstall}>
          <FontAwesomeIcon icon={faSyncAlt} /> Update
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
          <FontAwesomeIcon icon={faCheck} /> Managed{" "}
          <span className="text-muted">
            &ndash; v{sourceRecipeMeta.version}
          </span>
        </>
      );
    }

    // XXX: this should check the status of the underlying bricks and surface if there's any problems (because the
    // groups start collapsed, you wouldn't know where to look)
    return (
      <>
        <FontAwesomeIcon icon={faCheck} /> Active{" "}
        <span className="text-muted">&ndash; v{sourceRecipeMeta.version}</span>
      </>
    );
  }, [
    paused,
    managed,
    hasPermissions,
    requestPermissions,
    hasUpdate,
    reinstall,
    sourceRecipeMeta,
  ]);

  const onViewLogs = useCallback(() => {
    dispatch(
      installedPageSlice.actions.setLogsContext({
        title: label,
        messageContext: groupMessageContext,
      })
    );
  }, [dispatch, label, groupMessageContext]);

  const actionOptions = useMemo(
    () => [
      {
        title: (
          <>
            <FontAwesomeIcon icon={faShare} /> Share
          </>
        ),
        hide: onShare == null,
        action: onShare,
      },
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
            <FontAwesomeIcon icon={faSyncAlt} />{" "}
            {hasUpdate ? "Update" : "Reactivate"}
          </>
        ),
        className: hasUpdate ? "text-info" : "",
        action: reinstall,
        // Managed extensions are updated via the deployment banner
        hide: managed,
      },
      {
        title: (
          <>
            <FontAwesomeIcon icon={faTimes} /> Uninstall
          </>
        ),
        // #1532: temporary approach to controlling whether or not deployments can be uninstalled. In
        // the future we'll want this to depend on the member's role within the deployment's organization
        hide: managed && restrict("uninstall"),
        action: async () => {
          await removeMany(extensions);
        },
        className: "text-danger",
      },
    ],
    [
      onShare,
      restrict,
      extensions,
      hasUpdate,
      managed,
      onViewLogs,
      reinstall,
      removeMany,
    ]
  );

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
          <EllipsisMenu items={actionOptions} />
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
