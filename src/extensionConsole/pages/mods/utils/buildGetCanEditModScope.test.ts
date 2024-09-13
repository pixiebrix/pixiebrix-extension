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

import buildGetCanEditModScope from "@/extensionConsole/pages/mods/utils/buildGetCanEditModScope";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import { organizationStateFactory } from "@/testUtils/factories/authFactories";
import { UserRole } from "@/data/model/UserRole";

const userScope = "my-test-user";

describe("buildGetCanEditModScope", () => {
  it("returns true for a mod with the user's scope", () => {
    const canEditModScope = buildGetCanEditModScope(userScope, []);
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory({
        id: validateRegistryId(`${userScope}/my-test-mod`),
      }),
    });
    expect(canEditModScope(mod)).toBe(true);
  });

  it("returns true for a mod with a package editor role", () => {
    const organization = organizationStateFactory();
    const canEditModScope = buildGetCanEditModScope(userScope, [organization]);
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory({
        id: validateRegistryId(`${organization.scope}/my-test-mod`),
      }),
    });
    expect(canEditModScope(mod)).toBe(true);
  });

  it("returns false is user is not an editor role", () => {
    const organization = organizationStateFactory({
      role: UserRole.member,
    });
    const canEditModScope = buildGetCanEditModScope(userScope, [organization]);
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory({
        id: validateRegistryId(`${organization.scope}/my-test-mod`),
      }),
    });
    expect(canEditModScope(mod)).toBe(false);
  });

  it("returns false when membership scope does not match mod scope", () => {
    const organization = organizationStateFactory();
    const canEditModScope = buildGetCanEditModScope(userScope, [organization]);
    const mod = modDefinitionFactory({
      metadata: modMetadataFactory({
        id: validateRegistryId("@some-other-scope/my-test-mod"),
      }),
    });
    expect(canEditModScope(mod)).toBe(false);
  });
});
