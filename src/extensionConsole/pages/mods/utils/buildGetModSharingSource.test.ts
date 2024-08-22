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
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import { organizationStateFactory } from "@/testUtils/factories/authFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { nowTimestamp } from "@/utils/timeUtils";

const userScope = "my-test-user";

describe("buildGetModSharingSource", () => {
  it("handles personal mod", () => {
    const getSharingSource = buildGetModSharingSource(userScope, [], []);
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
    const modMetadata = modMetadataFactory();
    const organization = organizationStateFactory();
    const getSharingSource = buildGetModSharingSource(
      userScope,
      [organization],
      [
        activatedModComponentFactory({
          _recipe: modMetadata,
          _deployment: {
            id: autoUUIDSequence(),
            timestamp: nowTimestamp(),
            active: true,
          },
        }),
      ],
    );

    const mod = modDefinitionFactory({
      metadata: modMetadata,
      sharing: {
        public: true,
        organizations: [organization.id],
      },
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Deployment",
      label: organization.name,
      organization,
    });
  });

  it("handles team mod", () => {
    const organization = organizationStateFactory();
    const getSharingSource = buildGetModSharingSource(
      userScope,
      [organization],
      [],
    );
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory(),
      sharing: {
        public: true,
        organizations: [organization.id],
      },
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Team",
      label: organization.name,
      organization,
    });
  });

  it("handles public mod", () => {
    const getSharingSource = buildGetModSharingSource(userScope, [], []);
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory(),
      sharing: {
        public: true,
        organizations: [],
      },
    });

    expect(getSharingSource(mod)).toStrictEqual({
      type: "Public",
      label: "Public",
      organization: undefined,
    });
  });
});
