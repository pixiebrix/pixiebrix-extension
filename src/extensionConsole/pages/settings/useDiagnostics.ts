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

import { useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import useExtensionPermissions, {
  type DetailedPermissions,
} from "@/permissions/useExtensionPermissions";
import { type SerializedModComponent } from "@/types/modComponentTypes";
import { compact, uniqBy } from "lodash";
import { type StorageEstimate } from "@/types/browserTypes";
import { count as registrySize } from "@/registry/packageRegistry";
import { count as logSize } from "@/telemetry/logging";
import { count as traceSize } from "@/telemetry/trace";
import { count as eventsSize } from "@/background/telemetry";
import useUserAction from "@/hooks/useUserAction";
import download from "downloadjs";
import filenamify from "filenamify";
import { getExtensionVersion } from "@/utils/extensionUtils";
import { nowTimestamp } from "@/utils/timeUtils";

async function collectDiagnostics({
  modComponents,
  permissions,
}: {
  modComponents: SerializedModComponent[];
  permissions?: DetailedPermissions;
}) {
  const { version_name } = browser.runtime.getManifest();
  const version = getExtensionVersion();
  return {
    userAgent: window.navigator.userAgent,
    manifest: { version, version_name },
    permissions,
    storage: {
      storageEstimate: (await navigator.storage.estimate()) as StorageEstimate,
      brickCount: await registrySize(),
      logCount: await logSize(),
      traceCount: await traceSize(),
      eventCount: await eventsSize(),
    },
    extensions: {
      blueprints: uniqBy(
        compact(modComponents.map((x) => x.modMetadata)),
        (x) => x.id,
      ),
      extensions: modComponents.filter((x) => !x.modMetadata),
    },
  };
}

function useDiagnostics() {
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const permissionsState = useExtensionPermissions();

  const exportDiagnostics = useUserAction(
    async () => {
      if (!permissionsState.isSuccess) {
        throw new Error("Permissions not loaded, try again");
      }

      const data = await collectDiagnostics({
        permissions: permissionsState.data,
        modComponents: activatedModComponents,
      });

      download(
        JSON.stringify(data),
        filenamify(`diagnostics-${nowTimestamp()}.json`),
        "application/json",
      );
    },
    {
      successMessage: "Exported diagnostics",
      errorMessage: "Error exporting diagnostics",
    },
    [permissionsState, activatedModComponents],
  );

  return {
    exportDiagnostics,
  };
}

export default useDiagnostics;
