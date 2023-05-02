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

import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useEffect } from "react";
import { push } from "connected-react-router";
import { validateRegistryId } from "@/types/helpers";
import { type RegistryId } from "@/types/registryTypes";

function maybeDecodeBlueprintId(encoded: string): RegistryId | null {
  try {
    return validateRegistryId(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}

/**
 * Hook to parse information from an Extension Console activation URL, and redirect to the re-activation page as
 * necessary.
 */
function useActivateUrl(): {
  blueprintId: RegistryId | null;
  isReinstall: boolean;
} {
  const dispatch = useDispatch();
  const location = useLocation();

  // `useParams` below can't get the search params: https://reactrouter.com/en/main/hooks/use-params
  const isReinstall =
    new URLSearchParams(location.search).get("reinstall") === "1";

  const { blueprintId: encodedBlueprintId } = useParams<{
    blueprintId: string;
  }>();

  const blueprintId = maybeDecodeBlueprintId(encodedBlueprintId);

  const installedExtensions = useSelector(selectExtensions);

  // Redirect to reinstall page if the user already has the blueprint installed
  useEffect(() => {
    if (
      !isReinstall &&
      blueprintId &&
      installedExtensions.some((x) => x._recipe?.id === blueprintId)
    ) {
      dispatch(
        push(
          `/marketplace/activate/${encodeURIComponent(blueprintId)}?reinstall=1`
        )
      );
    }
  }, [dispatch, isReinstall, installedExtensions, blueprintId]);

  return { isReinstall, blueprintId };
}

export default useActivateUrl;
