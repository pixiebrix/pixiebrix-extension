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

import React from "react";
import { useGetModDefinitionQuery } from "@/data/service/api";
import useRegistryIdParam from "@/extensionConsole/pages/useRegistryIdParam";
import ActivateModDefinitionPage from "@/extensionConsole/pages/activateMod/ActivateModDefinitionPage";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Page for activating a mod definition by its registry ID.
 * @see ActivateStandaloneModDefinitionIdPage
 */
const ActivateModDefinitionIdPage: React.FunctionComponent = () => {
  const modId = useRegistryIdParam();
  assertNotNullish(modId, "modId is required to activate a mod definition");
  const modDefinitionQuery = useGetModDefinitionQuery(
    { modId },
    {
      // Force-refetch the latest data for mod definition before activation. (Because the user might
      // have already had the Extension Console open when the mod was updated.)
      refetchOnMountOrArgChange: true,
    },
  );

  return <ActivateModDefinitionPage modDefinitionQuery={modDefinitionQuery} />;
};

export default ActivateModDefinitionIdPage;
