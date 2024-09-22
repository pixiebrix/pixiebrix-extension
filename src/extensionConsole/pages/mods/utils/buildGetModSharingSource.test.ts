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

import buildGetModSharingSource from "@/extensionConsole/pages/mods/utils/buildGetModSharingSource";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import { organizationStateFactory } from "@/testUtils/factories/authFactories";
import {
  modInstanceFactory,
  personalDeploymentMetadataFactory,
  teamDeploymentMetadataFactory,
} from "@/testUtils/factories/modInstanceFactories";
import { createPrivateSharing } from "@/utils/registryUtils";
import {
  personalSharingDefinitionFactory,
  publicSharingDefinitionFactory,
  teamSharingDefinitionFactory,
} from "@/testUtils/factories/registryFactories";

const userScope = "my-test-user";

describe("buildGetModSharingSource", () => {
  it("handles personal mod", () => {
    const getSharingSource = buildGetModSharingSource(userScope, [], new Map());
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory({
        id: validateRegistryId(`${userScope}/my-test-mod`),
      }),
    });
    expect(getSharingSource(mod)).toStrictEqual({
      type: "Personal",
      label: "Personal",
      organization: undefined,
    });
  });

  it("handles deployment mod", () => {
    const organization = organizationStateFactory();

    const modInstance = modInstanceFactory({
      deploymentMetadata: teamDeploymentMetadataFactory({ organization }),
    });

    const getSharingSource = buildGetModSharingSource(
      userScope,
      [organization],
      new Map([[modInstance.definition.metadata.id, modInstance]]),
    );

    const mod = modDefinitionFactory({
      metadata: modInstance.definition.metadata,
      sharing: teamSharingDefinitionFactory({
        organizations: [organization.id],
      }),
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Deployment",
      label: organization.name,
      organization,
    });
  });

  it("handles deployment mod (old deployment metadata)", () => {
    const modInstance = modInstanceFactory({
      // Old deployment metadata doesn't include the organization directly
      deploymentMetadata: teamDeploymentMetadataFactory({
        organization: undefined,
      }),
    });

    const organization = organizationStateFactory();
    const getSharingSource = buildGetModSharingSource(
      userScope,
      [organization],
      new Map([[modInstance.definition.metadata.id, modInstance]]),
    );

    const mod = modDefinitionFactory({
      metadata: modInstance.definition.metadata,
      sharing: teamSharingDefinitionFactory({
        organizations: [organization.id],
      }),
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Deployment",
      label: organization.name,
      organization,
    });
  });

  it("handles public team mod", () => {
    const organization = organizationStateFactory();
    const getSharingSource = buildGetModSharingSource(
      userScope,
      [organization],
      new Map(),
    );
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory(),
      sharing: teamSharingDefinitionFactory({
        public: true,
        organizations: [organization.id],
      }),
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Team",
      label: organization.name,
      organization,
    });
  });

  it("handles public mod", () => {
    const getSharingSource = buildGetModSharingSource(userScope, [], new Map());
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory(),
      sharing: publicSharingDefinitionFactory(),
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Public",
      label: "Public",
      organization: undefined,
    });
  });

  it("handles personal deployment mod", () => {
    const modInstance = modInstanceFactory({
      deploymentMetadata: personalDeploymentMetadataFactory(),
    });

    const getSharingSource = buildGetModSharingSource(
      userScope,
      [],
      new Map([[modInstance.definition.metadata.id, modInstance]]),
    );

    const mod = modDefinitionFactory({
      metadata: modInstance.definition.metadata,
      sharing: createPrivateSharing(),
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "PersonalDeployment",
      label: "Personal (Synced)",
      organization: undefined,
    });
  });

  it("handles unknown sharing type", () => {
    const getSharingSource = buildGetModSharingSource(userScope, [], new Map());
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory(),
      sharing: personalSharingDefinitionFactory(),
    });
    expect(getSharingSource(mod)).toStrictEqual({
      type: "Unknown",
      label: "Unknown",
      organization: undefined,
    });
  });

  it("handles mod belonging to multiple organizations", () => {
    const organization1 = organizationStateFactory();
    const organization2 = organizationStateFactory();
    const getSharingSource = buildGetModSharingSource(
      userScope,
      [organization1, organization2],
      new Map(),
    );
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory(),
      sharing: teamSharingDefinitionFactory({
        organizations: [organization1.id, organization2.id],
      }),
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Team",
      label: organization1.name, // It should return the first matching organization
      organization: organization1,
    });
  });
});
