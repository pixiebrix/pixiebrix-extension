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

import buildGetModActivationStatus from "@/extensionConsole/pages/mods/utils/buildGetModActivationStatus";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import {
  modInstanceFactory,
  teamDeploymentMetadataFactory,
} from "@/testUtils/factories/modInstanceFactories";

describe("buildGetModActivationStatus", () => {
  it("returns inactive for a mod with no activated components", () => {
    const getActivationStatus = buildGetModActivationStatus(new Map());
    expect(getActivationStatus(modDefinitionFactory())).toBe("Inactive");
  });

  it("returns active for a mod with an activated component and no deployment", () => {
    const modInstance = modInstanceFactory();

    const getActivationStatus = buildGetModActivationStatus(
      new Map([[modInstance.definition.metadata.id, modInstance]]),
    );
    expect(getActivationStatus(modInstance.definition)).toBe("Active");
  });

  it("returns active for a mod with an activated component and an active deployment", () => {
    const modInstance = modInstanceFactory({
      deploymentMetadata: teamDeploymentMetadataFactory(),
    });

    const getActivationStatus = buildGetModActivationStatus(
      new Map([[modInstance.definition.metadata.id, modInstance]]),
    );
    expect(getActivationStatus(modInstance.definition)).toBe("Active");
  });

  it("returns paused for a mod with an activated component and a paused deployment", () => {
    const modInstance = modInstanceFactory({
      deploymentMetadata: teamDeploymentMetadataFactory({
        active: false,
      }),
    });

    const getActivationStatus = buildGetModActivationStatus(
      new Map([[modInstance.definition.metadata.id, modInstance]]),
    );
    expect(getActivationStatus(modInstance.definition)).toBe("Paused");
  });
});
