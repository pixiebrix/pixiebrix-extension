/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActiveModId } from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";
import { Card, Container, Table } from "react-bootstrap";
import styles from "@/pageEditor/tabs/modVariablesDefinition/ModVariablesDefinitionEditor.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  useGetEditablePackagesQuery,
  useListPackageVersionsQuery,
} from "@/data/service/api";
import type { RegistryId } from "@/types/registryTypes";
import { type PackageVersionDeprecated } from "@/types/contract";
import { type AsyncState } from "@/types/sliceTypes";
import AsyncStateGate from "@/components/AsyncStateGate";
import { dateFormat } from "@/utils/stringUtils";
import { mergeAsyncState, valueToAsyncState } from "@/utils/asyncStateUtils";
import { isInternalRegistryId } from "@/utils/registryUtils";

function useModPackageVersionsQuery(
  modId: RegistryId,
): AsyncState<PackageVersionDeprecated[] | string> {
  // Lookup the surrogate key for the package
  const editablePackagesQuery = useGetEditablePackagesQuery(undefined, {
    skip: isInternalRegistryId(modId),
  });
  const editablePackage = (editablePackagesQuery.data ?? []).find(
    (x) => x.name === modId,
  );

  const packageVersionsQuery = useListPackageVersionsQuery(
    {
      // @ts-expect-error -- skipped if nullish
      packageId: editablePackage?.id,
    },
    {
      skip: !editablePackage,
    },
  );

  return useMemo(() => {
    if (isInternalRegistryId(modId)) {
      return valueToAsyncState("Version History unavailable for unsaved mods");
    }

    if (editablePackage) {
      return packageVersionsQuery;
    }

    return mergeAsyncState(
      editablePackagesQuery,
      () => "Version History requires mod write permission",
    );
  }, [modId, editablePackage, packageVersionsQuery, editablePackagesQuery]);
}

const ModVersionHistory: React.FC = () => {
  const modId = useSelector(selectActiveModId);

  assertNotNullish(modId, "No active mod id");

  const packageVersionsQuery = useModPackageVersionsQuery(modId);

  return (
    <Container fluid className={styles.root}>
      <ErrorBoundary>
        <Card>
          <Card.Header>Version History</Card.Header>
          <Card.Body>
            <AsyncStateGate state={packageVersionsQuery}>
              {({ data }) => (
                <Table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeof data === "object" ? (
                      data.map((version) => (
                        <tr key={version.id}>
                          <td>{version.version}</td>
                          <td>
                            {dateFormat.format(Date.parse(version.updated_at))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          {data}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </AsyncStateGate>
          </Card.Body>
        </Card>
      </ErrorBoundary>
    </Container>
  );
};

export default ModVersionHistory;
