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

import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  registryIdFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";

describe("collectExistingConfiguredDependenciesForMod", () => {
  it("returns all integration dependencies when mod definition matches activated components", () => {
    const integrationId1 = registryIdFactory();
    const integrationOutputKey1 = validateOutputKey("integration1");
    const integrationId2 = registryIdFactory();
    const integrationOutputKey2 = validateOutputKey("integration2");
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: [
        modComponentDefinitionFactory({
          services: Object.fromEntries([
            [integrationOutputKey1, integrationId1],
            [integrationOutputKey2, integrationId2],
          ]),
        }),
      ],
    });
    const integrationDependency1 = integrationDependencyFactory({
      integrationId: integrationId1,
      outputKey: integrationOutputKey1,
      configId: uuidSequence(1),
    });
    const integrationDependency2 = integrationDependencyFactory({
      integrationId: integrationId2,
      outputKey: integrationOutputKey2,
      configId: uuidSequence(2),
    });
    const activatedModComponents = [
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [integrationDependency1],
      }),
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [integrationDependency2],
      }),
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [
          integrationDependency1,
          integrationDependency2,
        ],
      }),
    ];

    expect(
      collectExistingConfiguredDependenciesForMod(
        modDefinition,
        activatedModComponents,
      ),
    ).toEqual([integrationDependency1, integrationDependency2]);
  });

  it("returns only existing integration dependencies when mod definition has extra integrations", () => {
    const integrationId1 = registryIdFactory();
    const integrationOutputKey1 = validateOutputKey("integration1");
    const integrationId2 = registryIdFactory();
    const integrationOutputKey2 = validateOutputKey("integration2");
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: [
        modComponentDefinitionFactory({
          services: Object.fromEntries([
            [integrationOutputKey1, integrationId1],
            [integrationOutputKey2, integrationId2],
            [validateOutputKey("integration3"), registryIdFactory()],
            [validateOutputKey("integration4"), registryIdFactory()],
          ]),
        }),
      ],
    });
    const integrationDependency1 = integrationDependencyFactory({
      integrationId: integrationId1,
      outputKey: integrationOutputKey1,
      configId: uuidSequence(1),
    });
    const integrationDependency2 = integrationDependencyFactory({
      integrationId: integrationId2,
      outputKey: integrationOutputKey2,
      configId: uuidSequence(2),
    });
    const activatedModComponents = [
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [integrationDependency1],
      }),
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [integrationDependency2],
      }),
    ];

    expect(
      collectExistingConfiguredDependenciesForMod(
        modDefinition,
        activatedModComponents,
      ),
    ).toEqual([integrationDependency1, integrationDependency2]);
  });

  it("returns only existing integration dependencies when mod definition has fewer integrations", () => {
    const integrationId1 = registryIdFactory();
    const integrationOutputKey1 = validateOutputKey("integration1");
    const integrationId2 = registryIdFactory();
    const integrationOutputKey2 = validateOutputKey("integration2");
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: modMetadata,
      extensionPoints: [
        modComponentDefinitionFactory({
          services: Object.fromEntries([
            [integrationOutputKey1, integrationId1],
          ]),
        }),
      ],
    });
    const integrationDependency1 = integrationDependencyFactory({
      integrationId: integrationId1,
      outputKey: integrationOutputKey1,
      configId: uuidSequence(1),
    });
    const integrationDependency2 = integrationDependencyFactory({
      integrationId: integrationId2,
      outputKey: integrationOutputKey2,
      configId: uuidSequence(2),
    });
    const activatedModComponents = [
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [integrationDependency1],
      }),
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [integrationDependency2],
      }),
      activatedModComponentFactory({
        modMetadata,
        integrationDependencies: [
          integrationDependency1,
          integrationDependency2,
        ],
      }),
    ];

    expect(
      collectExistingConfiguredDependenciesForMod(
        modDefinition,
        activatedModComponents,
      ),
    ).toEqual([integrationDependency1]);
  });
});
