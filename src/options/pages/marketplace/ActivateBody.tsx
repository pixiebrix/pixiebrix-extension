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

import { ExtensionPointConfig, RecipeDefinition } from "@/types/definitions";
import React, { useCallback, useMemo } from "react";
import { useFormikContext } from "formik";
import { Link } from "react-router-dom";
import {
  useSelectedAuths,
  useSelectedExtensions,
} from "@/options/pages/marketplace/ConfigureBody";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { locator } from "@/background/locator";
import GridLoader from "react-spinners/GridLoader";
import { useAsyncState } from "@/hooks/common";
import { faCubes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { reportEvent } from "@/telemetry/events";
import { getErrorMessage } from "@/errors";
import {
  containsPermissions,
  selectOptionalPermissions,
} from "@/utils/permissions";
import { ServiceAuthPair } from "@/core";
import useNotifications from "@/hooks/useNotifications";
import { uniq } from "lodash";
import { Card, Table } from "react-bootstrap";
import useReportError from "@/hooks/useReportError";
import { resolveRecipe } from "@/registry/internal";

interface ActivateProps {
  blueprint: RecipeDefinition;
}

export function useEnsurePermissions(
  blueprint: RecipeDefinition,
  selected: ExtensionPointConfig[],
  serviceAuths: ServiceAuthPair[]
) {
  const notify = useNotifications();
  const { submitForm } = useFormikContext();

  const [permissionState, isPending, error] = useAsyncState(async () => {
    await locator.refreshLocal();
    const permissions = await collectPermissions(
      await resolveRecipe(blueprint, selected),
      serviceAuths
    );
    const enabled = await containsPermissions(permissions);
    return {
      enabled,
      permissions,
    };
  }, [selected, serviceAuths]);

  const { enabled, permissions } = permissionState ?? {
    enabled: false,
    permissions: null,
  };

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (error: unknown) {
      notify.error(`Error granting permissions: ${getErrorMessage(error)}`, {
        error,
      });
      return false;
    }

    if (!accepted) {
      // Event is tracked in `activate` callback
      notify.warning("You declined the permissions");
      return false;
    }

    return true;
  }, [permissions, notify]);

  const activate = useCallback(() => {
    // Can't use async here because Firefox loses track of trusted UX event
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    void request().then((accepted: boolean) => {
      if (accepted) {
        reportEvent("MarketplaceActivate", {
          blueprintId: blueprint.metadata.id,
          extensions: selected.map((x) => x.label),
        });
        return submitForm();
      }

      reportEvent("MarketplaceRejectPermissions", {
        blueprintId: blueprint.metadata.id,
        extensions: selected.map((x) => x.label),
      });
    });
  }, [selected, request, submitForm, blueprint.metadata]);

  return {
    enabled,
    request,
    permissions,
    activate,
    isPending,
    extensions: selected,
    error,
  };
}

const ActivateBody: React.FunctionComponent<ActivateProps> = ({
  blueprint,
}) => {
  const selectedExtensions = useSelectedExtensions(blueprint.extensionPoints);
  const selectedAuths = useSelectedAuths();
  const { enabled, isPending, permissions, error } = useEnsurePermissions(
    blueprint,
    selectedExtensions,
    selectedAuths
  );

  useReportError(error);

  const permissionsList = useMemo(() => {
    if (permissions == null) {
      return [];
    }

    // `selectOptionalPermissions` never returns any origins because we request *://*
    return uniq([
      ...selectOptionalPermissions(permissions.permissions),
      ...permissions.origins,
    ]);
  }, [permissions]);

  const helpText = useMemo(() => {
    if (isPending) {
      return <GridLoader />;
    }

    if (error) {
      return (
        <Card.Text className="text-danger">
          An error occurred determining additional permissions
        </Card.Text>
      );
    }

    if (permissionsList.length === 0) {
      return <Card.Text>No special permissions required</Card.Text>;
    }

    if (enabled) {
      return (
        <Card.Text>
          PixieBrix already has the permissions required for the bricks
          you&apos;ve selected
        </Card.Text>
      );
    }

    return (
      <Card.Text>
        Your browser will prompt to you approve any permissions you haven&apos;t
        granted yet
      </Card.Text>
    );
  }, [permissionsList, enabled, error, isPending]);

  return (
    <>
      <Card.Body className="mb-0 p-3">
        <Card.Title>Review Permissions & Activate</Card.Title>
        <p className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> You can de-activate bricks at
          any time on the{" "}
          <Link to="/installed">
            <u>
              <FontAwesomeIcon icon={faCubes} />
              {"  "}Active Bricks page
            </u>
          </Link>
        </p>
      </Card.Body>

      <Card.Body className="p-3">
        <Card.Subtitle>Permissions & URLs</Card.Subtitle>
        {helpText}
      </Card.Body>
      {permissionsList.length > 0 && (
        // Use Table single column table instead of ListGroup to more closely match style on other wizard tabs
        <Table variant="flush">
          <tbody>
            {permissionsList.map((permission) => (
              <tr key={permission}>
                <td>{permission}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

export default ActivateBody;
