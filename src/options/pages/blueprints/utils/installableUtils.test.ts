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

import {
  extensionFactory,
  recipeDefinitionFactory,
  sharingDefinitionFactory,
} from "@/testUtils/factories";
import { getSharingType } from "./installableUtils";
import { uuidv4 } from "@/types/helpers";
import { UserRole } from "@/types/contract";
import { Installable } from "@/options/pages/blueprints/blueprintsTypes";

describe("getSharingType", () => {
  test("personal extension", () => {
    const installable: Installable = extensionFactory() as any;
    const { type, label } = getSharingType(installable, [], "test_scope", []);

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
    const { type, label } = getSharingType(installable, [], "test_scope", []);

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

    const { type, label } = getSharingType(
      installable,
      testOrganizations,
      "test_scope",
      []
    );

    expect(type).toBe("Deployment");
    expect(label).toBe("test_org");
  });

  test("team installable", () => {
    const installable: Installable = recipeDefinitionFactory() as any;
    const orgId = uuidv4();

    // @ts-expect-error -- we are generating a test recipe
    installable.sharing.organizations = [orgId];

    const testOrganizations = [
      {
        id: orgId,
        name: "test_org",
        role: UserRole.admin,
      },
    ];

    const { type, label } = getSharingType(
      installable,
      testOrganizations,
      "test_scope",
      []
    );

    expect(type).toBe("Team");
    expect(label).toBe("test_org");
  });

  test("public installable", () => {
    const installable: Installable = recipeDefinitionFactory({
      sharing: sharingDefinitionFactory({ public: true }),
    }) as any;

    const { type, label } = getSharingType(installable, [], "test_scope", []);

    expect(type).toBe("Public");
    expect(label).toBe("Public");
  });
});
