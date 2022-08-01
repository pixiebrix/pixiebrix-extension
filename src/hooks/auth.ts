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

import { RawServiceConfiguration } from "@/core";
import { AuthOption } from "@/auth/authTypes";
import { useAsyncState } from "./common";
import { readRawConfigurations } from "@/services/registry";
import { useMemo, useCallback } from "react";
import { useGetServiceAuthsQuery } from "@/services/api";
import { sortBy } from "lodash";
import { SanitizedAuth } from "@/types/contract";

function defaultLabel(label: string): string {
  const normalized = (label ?? "").trim();
  return normalized === "" ? "Default" : normalized;
}

function decideRemoteLabel(auth: SanitizedAuth): string {
  let visibility = "✨ Built-in";

  if (auth.organization?.name) {
    visibility = auth.organization.name;
  }

  if (auth.user) {
    visibility = "Private";
  }

  return `${defaultLabel(auth.label)} — ${visibility}`;
}

export function useAuthOptions(): [AuthOption[], () => void] {
  // Using readRawConfigurations instead of the store for now so that we can refresh the list independent of the
  // redux store. (The option may have been added in a different tab). At some point, we'll need parts of the redux
  // store to reload if it's changed on another tab
  const [configuredServices, isLocalLoading, _localError, refreshLocal] =
    useAsyncState<RawServiceConfiguration[]>(readRawConfigurations);

  const {
    data: remoteAuths,
    isFetching: isRemoteLoading,
    refetch: refreshRemote,
  } = useGetServiceAuthsQuery();

  const authOptions = useMemo(() => {
    if (isLocalLoading || isRemoteLoading) {
      // Return no options to avoid unwanted default behavior when the local options are loaded but the remote options
      // are still pending
      return [];
    }

    const localOptions = sortBy(
      (configuredServices ?? []).map((x) => ({
        value: x.id,
        label: `${defaultLabel(x.label)} — Private`,
        local: true,
        serviceId: x.serviceId,
      })),
      (x) => x.label
    );

    const sharedOptions = sortBy(
      (remoteAuths ?? []).map((x) => ({
        value: x.id,
        label: decideRemoteLabel(x),
        local: false,
        user: x.user,
        serviceId: x.service.config.metadata.id,
      })),
      (x) => (x.user ? 0 : 1),
      (x) => x.label
    );

    return [...localOptions, ...sharedOptions];
  }, [isLocalLoading, isRemoteLoading, remoteAuths, configuredServices]);

  const refresh = useCallback(() => {
    refreshRemote();
    void refreshLocal();
  }, [refreshRemote, refreshLocal]);

  return [authOptions, refresh];
}
