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

import { launchAuthIntegration, registry } from "@/background/messenger/api";
import oauth2IntegrationDefinition from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

jest.mocked(registry.find).mockResolvedValue({
  id: (oauth2IntegrationDefinition!.metadata as any).id,
  config: oauth2IntegrationDefinition,
} as any);

describe("launchAuthIntegration", () => {
  it("throws error if no local auths are found", async () => {
    const integrationId = registryIdFactory();
    await expect(launchAuthIntegration({ integrationId })).rejects.toThrow(
      /No local auths found/,
    );
  });
});
