/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { selectAuth } from "@/auth/authSelectors";
import { type Organization } from "@/types/contract";
import { sortBy } from "lodash";
import { useMemo } from "react";
import { useSelector } from "react-redux";

const sortOrganizations = (organizations: Organization[]) =>
  sortBy(organizations, (organization) => organization.name);

export default function useSortOrganizations() {
  const { organizations } = useSelector(selectAuth);

  return useMemo(() => sortOrganizations(organizations), [organizations]);
}
