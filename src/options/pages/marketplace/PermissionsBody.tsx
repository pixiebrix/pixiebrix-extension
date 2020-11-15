/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import React, { useCallback, useMemo, useState } from "react";
import { useToasts } from "react-toast-notifications";
import {
  checkPermissions,
  collectPermissions,
  ensureAllPermissions,
  originPermissions,
} from "@/permissions";
import { Button, Card, Table } from "react-bootstrap";
import useAsyncEffect from "use-async-effect";
import {
  ExtensionPointDefinition,
  RecipeDefinition,
} from "@/types/definitions";
import { useSelectedExtensions } from "@/options/pages/marketplace/ConfigureBody";
import { useAsyncState } from "@/hooks/common";
import { GridLoader } from "react-spinners";

function useEnsurePermissions(extensions: ExtensionPointDefinition[]) {
  const { addToast } = useToasts();
  const [accepted, setAccepted] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(undefined);

  useAsyncEffect(
    async (isMounted) => {
      const enabled = await checkPermissions(
        await collectPermissions(extensions)
      );
      if (!isMounted()) return;
      setEnabled(enabled);
    },
    [extensions]
  );

  const request = useCallback(async () => {
    try {
      const accepted = await ensureAllPermissions(
        await collectPermissions(extensions)
      );
      setAccepted(accepted);
      if (accepted) {
        setEnabled(true);
      }
    } catch (err) {
      console.error(err);
      addToast(`Error granting permissions: ${err}`, {
        appearance: "error",
        autoDismiss: true,
      });
    }
  }, [extensions, setAccepted, setEnabled]);

  return { enabled, accepted, request };
}

interface OwnProps {
  blueprint: RecipeDefinition;
}

const PermissionsBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const selected = useSelectedExtensions(blueprint.extensionPoints);

  const {
    enabled,
    accepted,
    request: requestPermissions,
  } = useEnsurePermissions(selected);

  const [permissions, isPending] = useAsyncState(
    async () => originPermissions(await collectPermissions(selected)),
    [selected]
  );

  const content = useMemo(() => {
    if (enabled && !accepted) {
      return (
        <div>
          <p>The required browser permissions are already enabled</p>
          <Button variant="info" disabled>
            Grant Permissions
          </Button>
        </div>
      );
    } else if (accepted) {
      return (
        <div>
          <p>
            You&apos;ve granted the browser permissions required for this
            blueprint
          </p>
          <Button variant="info" disabled>
            Grant Permissions
          </Button>
        </div>
      );
    } else {
      return (
        <div>
          <p>
            When you click the button, your browser will prompt you to grant
            permissions for the bricks in this blueprint
          </p>
          <Button variant="info" onClick={requestPermissions}>
            Grant Permissions
          </Button>
        </div>
      );
    }
  }, [enabled, accepted]);

  return (
    <>
      <Card.Body className="p-3">{content}</Card.Body>
      <Table>
        <thead>
          <tr>
            <th>URL</th>
            <th className="w-100">Permissions</th>
          </tr>
        </thead>
        <tbody>
          {isPending && <GridLoader />}
          {permissions?.length > 0 &&
            permissions.map((x, i) => {
              const additional = x.permissions.filter(
                (x) => !["tabs", "webNavigation"].includes(x)
              );
              return (
                <tr key={i}>
                  <td>{x.origins.length ? x.origins.join(", ") : "Any URL"}</td>
                  <td>
                    <ul className="mb-0">
                      <li>Read/write information and detect page navigation</li>
                      {additional.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          {permissions?.length === 0 && (
            <tr>
              <td colSpan={2}>No permissions required</td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default PermissionsBody;
