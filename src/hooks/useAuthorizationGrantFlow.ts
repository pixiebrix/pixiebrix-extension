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

import { getBaseURL } from "@/services/baseService";
import { IService, RegistryId } from "@/core";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { ServiceDefinition } from "@/types/definitions";

type FlowOptions = {
  target: "_blank" | "_self";
};

async function launchAuthorizationGrantFlow(
  serviceId: RegistryId,
  { target }: FlowOptions
) {
  const url = new URL("services/", await getBaseURL());
  url.searchParams.set("id", serviceId);

  if (target === "_blank") {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- browser window
    window.open(url.href);
  } else {
    location.href = url.href;
  }
}

function useAuthorizationGrantFlow() {
  const modals = useModals();

  return useCallback(
    async (service: IService | ServiceDefinition, options: FlowOptions) => {
      const name = "name" in service ? service.name : service.metadata.name;
      const serviceId = "id" in service ? service.id : service.metadata.id;

      const confirm = await modals.showConfirmation({
        title: "Configure Integration",
        message: `${name} uses a type of authentication that's supported in the Admin Console. Click Configure to continue to the Admin Console`,
        cancelCaption: "Cancel",
        submitCaption: "Configure",
        submitVariant: "primary",
      });

      if (!confirm) {
        return;
      }

      await launchAuthorizationGrantFlow(serviceId, options);
    },
    [modals]
  );
}

export default useAuthorizationGrantFlow;
