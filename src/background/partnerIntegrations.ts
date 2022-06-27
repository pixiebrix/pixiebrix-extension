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

import { locator as serviceLocator } from "@/background/locator";
import { validateRegistryId } from "@/types/helpers";
import { isEmpty } from "lodash";
import { expectContext } from "@/utils/expectContext";
import { safeParseUrl } from "@/utils";
import { RegistryId } from "@/core";
import { launchOAuth2Flow } from "@/background/auth";
import serviceRegistry from "@/services/registry";
import { setPartnerAuth } from "@/auth/token";

export type PartnerPrincipal = {
  hostname: string;
  principalId: string | null;
};

export async function getPartnerPrincipals(): Promise<PartnerPrincipal[]> {
  expectContext("background");

  const auths = await serviceLocator.locateAllForService(
    validateRegistryId("automation-anywhere/control-room")
  );
  return auths
    .filter((auth) => !isEmpty(auth.config.controlRoomUrl))
    .map((auth) => ({
      hostname: safeParseUrl(auth.config.controlRoomUrl).hostname,
      principalId: auth.config.username,
    }));
}

/**
 * Launch the browser's web auth flow get a partner token for communicating with the PixieBrix server.
 */
export async function launchAuthIntegration({
  serviceId,
}: {
  serviceId: RegistryId;
}): Promise<void> {
  expectContext("background");

  const service = await serviceRegistry.lookup(serviceId);

  await serviceLocator.refreshLocal();
  const auths = await serviceLocator.locateAllForService(serviceId);

  if (auths.length === 0) {
    throw new Error(`No configurations found for: ${service.id}`);
  }

  if (auths.length > 1) {
    console.warn("Multiple configurations found for: %s", service.id);
  }

  const config = await serviceLocator.getLocalConfig(auths[0].id);

  const data = await launchOAuth2Flow(service, config);

  await setPartnerAuth({ authId: config.id, token: data.access_token });
}
