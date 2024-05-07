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

import { useField } from "formik";
import useSanitizedIntegrationConfigFormikAdapter from "@/integrations/useSanitizedIntegrationConfigFormikAdapter";
import { UIPATH_SERVICE_IDS } from "@/contrib/uipath/process";
import { useMemo } from "react";
import { releaseSchema } from "@/contrib/uipath/typeUtils";
import { optionalFactory } from "@/contrib/remoteOptionUtils";
import { type Option } from "@/components/form/widgets/SelectWidget";
import {
  type ODataResponseData,
  type Release,
} from "@/contrib/uipath/uipathContract";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import cachePromise from "@/utils/cachePromise";
import useAsyncState from "@/hooks/useAsyncState";
import { getPlatform } from "@/platform/platformContext";

const optionalFetchReleases = optionalFactory(fetchReleases);

type ReleaseOption = Option & { data: Release };

async function fetchReleases(
  config: SanitizedIntegrationConfig,
): Promise<ReleaseOption[]> {
  const response = await getPlatform().request<ODataResponseData<Release>>(
    config,
    {
      url: "/odata/Releases",
      method: "get",
    },
  );
  const releases = response.data.value;
  return releases.map((x) => ({
    value: x.Key,
    label: `${x.Name} - ${x.ProcessVersion}`,
    data: x,
  }));
}

export function useSelectedRelease(
  releaseKeyFieldName: string,
  integrationFieldName: string,
) {
  const [{ value: releaseKey }] = useField<string>(releaseKeyFieldName);

  const { data: sanitizedConfig } = useSanitizedIntegrationConfigFormikAdapter(
    UIPATH_SERVICE_IDS,
    integrationFieldName,
  );

  const releasesPromise = useMemo(
    async () =>
      cachePromise(["uipath:useSelectedRelease", sanitizedConfig], async () =>
        optionalFetchReleases(sanitizedConfig),
      ),
    [sanitizedConfig],
  );

  const { data: selectedRelease } = useAsyncState(async () => {
    const options = (await releasesPromise) as ReleaseOption[];
    const { data: release } =
      options.find((option) => option.data.Key === releaseKey) ?? {};
    const schema = release ? releaseSchema(release) : null;
    return {
      release,
      schema,
    };
  }, [releasesPromise, releaseKey]);

  return {
    selectedRelease,
    releasesPromise,
    releaseKey,
  };
}
