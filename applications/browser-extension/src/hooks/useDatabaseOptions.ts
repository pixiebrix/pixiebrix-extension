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

import {
  useGetDatabasesQuery,
  useGetOrganizationsQuery,
} from "@/data/service/api";
import useMergeAsyncState from "./useMergeAsyncState";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import { type Option } from "@/components/form/widgets/SelectWidget";
import { type Database } from "@/types/contract";
import { assertNotNullish } from "../utils/nullishUtils";
import { type Team } from "@/data/model/Team";

function databasesToOptions(
  databases: Database[],
  organizations: Team[],
): Option[] {
  return databases.map((database) => {
    const organization = organizations.find(
      (x) => x.teamId === database.organization_id,
    );

    assertNotNullish(database.id, "Database must have a valid id");
    return {
      label: `${database.name} - ${organization?.teamName ?? "Private"}`,
      value: database.id,
    };
  });
}

/**
 * React Hook that returns a fetchable list of private and team database options.
 * @param refetchOnMount true to refetch available databases on mount (default: false)
 */
function useDatabaseOptions({
  refetchOnMount,
}: { refetchOnMount?: boolean } = {}): FetchableAsyncState<Option[]> {
  const databasesQueryState = useGetDatabasesQuery(undefined, {
    refetchOnMountOrArgChange: refetchOnMount,
  });

  const organizationsQueryState = useGetOrganizationsQuery(undefined, {
    refetchOnMountOrArgChange: refetchOnMount,
  });

  return useMergeAsyncState(
    databasesQueryState,
    organizationsQueryState,
    // Provide as module function so useMergeAsyncState can memoize it
    databasesToOptions,
  );
}

export default useDatabaseOptions;
