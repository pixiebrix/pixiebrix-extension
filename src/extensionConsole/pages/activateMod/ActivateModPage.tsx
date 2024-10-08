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

import React, { useEffect } from "react";
import RequireBrickRegistry from "@/extensionConsole/components/RequireBrickRegistry";
import ActivateModCard from "@/extensionConsole/pages/activateMod/ActivateModCard";
import { faStoreAlt } from "@fortawesome/free-solid-svg-icons";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import notify from "@/utils/notify";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useHistory } from "react-router";
import Page from "@/layout/Page";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useSelector } from "react-redux";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { BusinessError } from "@/errors/businessErrors";
import { DefinitionKinds } from "@/types/registryTypes";
import { truncate } from "lodash";
import { assertNotNullish } from "@/utils/nullishUtils";
import useRegistryIdParam from "@/extensionConsole/pages/useRegistryIdParam";
import { useGetModDefinitionQuery } from "@/data/service/api";
import { selectModInstanceMap } from "@/store/modComponents/modInstanceSelectors";

/**
 * Effect to automatically redirect the user to the mods screen if the mod is not found.
 */
function useModNotFoundRedirectEffect(error: unknown): void {
  const history = useHistory();

  const isNotFoundError = isAxiosError(error)
    ? error.response?.status === 404
    : false;

  useEffect(() => {
    if (isNotFoundError) {
      notify.error({
        message: "Mod does not exist",
        error: new BusinessError(
          "Verify the mod URL or contact your team admin to request access to this mod.",
        ),
      });
      history.push("/mods");
    }
  }, [isNotFoundError, history]);
}

/**
 * Common page for activating a mod definition
 */
const ActivateModPage: React.FC = () => {
  const modId = useRegistryIdParam();
  assertNotNullish(modId, "modId is required to activate a mod definition");

  const modInstanceMap = useSelector(selectModInstanceMap);

  const modDefinitionQuery = useGetModDefinitionQuery(
    { modId },
    {
      // Force-refetch the latest data for mod definition before activation. (Because the user might
      // have already had the Extension Console open when the mod was updated.)
      refetchOnMountOrArgChange: true,
    },
  );

  // Redirect on 404
  useModNotFoundRedirectEffect(modDefinitionQuery.error);

  const validatedModDefinitionQuery = useMergeAsyncState(
    modDefinitionQuery,
    (modDefinition: ModDefinition) => {
      if (modDefinition.kind !== DefinitionKinds.MOD) {
        // There's nothing stopping someone from hitting the link with a non-mod id (e.g., integration, component). So
        // show an error message if not a valid mod definition
        throw new BusinessError(`${modDefinition.metadata.name} is not a mod. Verify
        the activation URL.`);
      }

      return modDefinition;
    },
  );

  // For mod definitions, we could use the queried modId to decide if the mod is already activated before the mod
  // definition is fetched. But in practice, fetching the mod definition will be fast enough that there's no UX benefit
  const { data: modDefinition } = validatedModDefinitionQuery;

  if (!validatedModDefinitionQuery.isSuccess) {
    return (
      <Page
        title="Activate Mod"
        icon={faStoreAlt}
        documentationUrl="https://docs.pixiebrix.com/activating-mods"
        isPending={modDefinitionQuery.isFetching}
        error={modDefinitionQuery.error}
      >
        <div
        // Children will never be rendered, but children is a required prop
        />
      </Page>
    );
  }

  const isReactivate = modInstanceMap.has(modId);
  const title = `${isReactivate ? "Reactivate" : "Activate"} ${truncate(
    modDefinition?.metadata.name,
    {
      length: 15,
    },
  )}`;

  assertNotNullish(modDefinitionQuery.data, "modDefinition is nullish");
  // Require that bricks have been fetched at least once before showing. Handles new mod activation where the bricks
  // haven't been completely fetched yet.
  // XXX: we might also want to enforce a full re-sync of the brick registry to ensure the latest brick
  // definitions are available for determining permissions. That's likely not required though, as brick permissions
  // do not change frequently.
  return (
    <Page
      title={title}
      icon={faStoreAlt}
      documentationUrl="https://docs.pixiebrix.com/activating-mods"
    >
      <div className="max-950">
        <ErrorBoundary>
          <RequireBrickRegistry>
            <ActivateModCard
              modDefinition={modDefinitionQuery.data}
              isReactivate={isReactivate}
            />
          </RequireBrickRegistry>
        </ErrorBoundary>
      </div>
    </Page>
  );
};

export default ActivateModPage;
