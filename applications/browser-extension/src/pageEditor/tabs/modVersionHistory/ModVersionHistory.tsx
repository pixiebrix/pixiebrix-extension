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
import { Card, Container } from "react-bootstrap";
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
import type { Column } from "react-table";
import PaginatedTable from "@/components/paginatedTable/PaginatedTable";
import { MemoryRouter } from "react-router";

type TableColumn = Column<PackageVersionDeprecated>;

const COLUMNS: TableColumn[] = [
  {
    Header: "Version",
    accessor: "version",
  },
  {
    Header: "Timestamp",
    accessor: "updated_at",
    Cell({ value }) {
      return <>{dateFormat.format(Date.parse(value))}</>;
    },
  },
  {
    Header: "Updated By",
    accessor: "updated_by",
    Cell({ value }) {
      const { email } = value ?? {};
      return email ? (
        <a href={`mailto:${email}`}>{email}</a>
      ) : (
        <span className="text-muted">Unknown</span>
      );
    },
  },
  {
    Header: "Message",
    accessor: "message",
    Cell({ value }) {
      return value ? (
        <>{value}</>
      ) : (
        <span className="text-muted">No message provided</span>
      );
    },
  },
];

function useModPackageVersionsQuery(modId: RegistryId): AsyncState<{
  data: PackageVersionDeprecated[];
  message: string | undefined;
}> {
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
      return valueToAsyncState({
        data: [],
        message: "Version History unavailable for unsaved mods",
      });
    }

    if (editablePackage) {
      return mergeAsyncState(
        packageVersionsQuery,
        (data: PackageVersionDeprecated[]) => ({
          data,
          message: undefined,
        }),
      );
    }

    return mergeAsyncState(editablePackagesQuery, () => ({
      data: [],
      message: "Viewing Version History requires mod write permission",
    }));
  }, [modId, editablePackage, packageVersionsQuery, editablePackagesQuery]);
}

const PackageVersionRow: React.VFC<{ version: PackageVersionDeprecated }> = ({
  version,
}) => {
  const email = version.updated_by?.email;

  return (
    <tr>
      <td>{version.version}</td>
      <td>{dateFormat.format(Date.parse(version.updated_at))}</td>
      <td>
        {email ? (
          <a href={`mailto:${email}`}>{email}</a>
        ) : (
          <span className="text-muted">Unknown</span>
        )}
      </td>
      <td>
        {version.message ?? (
          <span className="text-muted">No message provided</span>
        )}
      </td>
    </tr>
  );
};

const ModVersionHistory: React.FC = () => {
  const modId = useSelector(selectActiveModId);

  assertNotNullish(modId, "No active mod id");

  const packageVersionsQuery = useModPackageVersionsQuery(modId);

  return (
    <Container fluid className={styles.root}>
      <ErrorBoundary>
        <Card>
          <Card.Header>Version History</Card.Header>
          <Card.Body className="p-0">
            <MemoryRouter>
              <AsyncStateGate state={packageVersionsQuery}>
                {({ data: { data, message } }) => (
                  // PaginatedTable includes a useLocation call because it supports syncing the page number with the URL
                  // We're not using that feature here, but still need to ensure it's wrapped in a Router so the
                  // useLocation call doesn't error
                  <MemoryRouter>
                    <PaginatedTable
                      columns={COLUMNS}
                      data={data}
                      emptyMessage={message}
                    />
                  </MemoryRouter>
                )}
              </AsyncStateGate>
            </MemoryRouter>
          </Card.Body>
        </Card>
      </ErrorBoundary>
    </Container>
  );
};

export default ModVersionHistory;
