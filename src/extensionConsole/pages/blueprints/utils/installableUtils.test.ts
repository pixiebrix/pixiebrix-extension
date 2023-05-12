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

import {
  getSharingType,
  isExtension,
  isUnavailableRecipe,
} from "./installableUtils";
import { uuidv4 } from "@/types/helpers";
import { UserRole } from "@/types/contract";
import {
  type Installable,
  type UnavailableRecipe,
} from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import { type ResolvedExtension } from "@/types/extensionTypes";
import { extensionFactory } from "@/testUtils/factories/extensionFactories";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { recipeDefinitionFactory } from "@/testUtils/factories/recipeFactories";

describe("getSharingType", () => {
  test("personal extension", () => {
    const installable: Installable = extensionFactory() as any;
    const { type, label } = getSharingType({
      installable,
      organizations: [],
      scope: "test_scope",
      installedExtensions: [],
    });

    expect(type).toBe("Personal");
    expect(label).toBe("Personal");
  });

  test("public deployment", () => {
    const installable: Installable = extensionFactory({
      _deployment: {
        id: uuidv4(),
        active: true,
        timestamp: new Date().toISOString(),
      },
    }) as any;
    const { type, label } = getSharingType({
      installable,
      organizations: [],
      scope: "test_scope",
      installedExtensions: [],
    });

    expect(type).toBe("Deployment");
    expect(label).toBe("Deployment");
  });

  test("organization deployment", () => {
    const orgId = uuidv4();
    const installable: Installable = extensionFactory({
      _deployment: {
        id: orgId,
        active: true,
        timestamp: new Date().toISOString(),
      },
    }) as any;

    // @ts-expect-error -- we are generating a test extension
    installable._recipe = {
      id: "test_org",
      sharing: {
        organizations: [orgId],
      },
    };

    const testOrganizations = [
      {
        id: orgId,
        name: "test_org",
        role: UserRole.admin,
      },
    ];

    const { type, label } = getSharingType({
      installable,
      organizations: testOrganizations,
      scope: "test_scope",
      installedExtensions: [],
    });

    expect(type).toBe("Deployment");
    expect(label).toBe("test_org");
  });

  test("team installable", () => {
    const installable = recipeDefinitionFactory();
    const orgId = uuidv4();

    installable.sharing.organizations = [orgId];

    const testOrganizations = [
      {
        id: orgId,
        name: "test_org",
        role: UserRole.admin,
      },
    ];

    const { type, label } = getSharingType({
      installable,
      organizations: testOrganizations,
      scope: "test_scope",
      installedExtensions: [],
    });

    expect(type).toBe("Team");
    expect(label).toBe("test_org");
  });

  test("public installable", () => {
    const installable: Installable = recipeDefinitionFactory({
      sharing: sharingDefinitionFactory({ public: true }),
    }) as any;

    const { type, label } = getSharingType({
      installable,
      organizations: [],
      scope: "test_scope",
      installedExtensions: [],
    });

    expect(type).toBe("Public");
    expect(label).toBe("Public");
  });
});

describe("isExtension", () => {
  it("returns true for an extension", () => {
    const installable = extensionFactory() as ResolvedExtension;
    expect(isExtension(installable)).toBe(true);
  });

  it("returns false for a recipe", () => {
    const installable = recipeDefinitionFactory();
    expect(isExtension(installable)).toBe(false);
  });
});

describe("isUnavailableRecipe", () => {
  it("returns false for a recipe definition", () => {
    const installable = recipeDefinitionFactory();
    expect(isUnavailableRecipe(installable)).toBe(false);
  });

  it("returns true for UnavailableRecipe", () => {
    const installable = {
      isStub: true,
    } as UnavailableRecipe;
    expect(isUnavailableRecipe(installable)).toBe(true);
  });

  it("returns false for an extension", () => {
    const installable = extensionFactory() as ResolvedExtension;
    expect(isUnavailableRecipe(installable)).toBe(false);
  });
});
