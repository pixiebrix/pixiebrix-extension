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

import {
  getSharingSource,
  getStandaloneModComponentRuntimeModId,
  isStandaloneModComponent,
  isUnavailableMod,
  normalizeModOptionsDefinition,
} from "./modUtils";
import { isRegistryId, uuidv4 } from "@/types/helpers";
import { UserRole } from "@/types/contract";
import { type Mod, type UnavailableMod } from "@/types/modTypes";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { InvalidTypeError } from "@/errors/genericErrors";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { freeze } from "@/utils/objectUtils";
import {
  autoUUIDSequence,
  timestampFactory,
} from "@/testUtils/factories/stringFactories";

describe("getStandaloneModComponentRuntimeModId", () => {
  it("returns valid registry id", () => {
    expect(
      isRegistryId(getStandaloneModComponentRuntimeModId(autoUUIDSequence())),
    ).toBe(true);
  });
});

describe("getSharingType", () => {
  test("throws on invalid type", () => {
    const mod: Mod = {} as any;
    expect(() =>
      getSharingSource({
        mod,
        organizations: [],
        userScope: "test_scope",
        modComponents: [],
      }),
    ).toThrow(InvalidTypeError);
  });

  test("personal extension", () => {
    const mod: Mod = modComponentFactory() as any;
    const { type, label } = getSharingSource({
      mod,
      organizations: [],
      userScope: "test_scope",
      modComponents: [],
    });

    expect(type).toBe("Personal");
    expect(label).toBe("Personal");
  });

  test("public deployment", () => {
    const mod: Mod = modComponentFactory({
      _deployment: {
        id: uuidv4(),
        active: true,
        timestamp: timestampFactory(),
      },
    }) as any;
    const { type, label } = getSharingSource({
      mod,
      organizations: [],
      userScope: "test_scope",
      modComponents: [],
    });

    expect(type).toBe("Deployment");
    expect(label).toBe("Deployment");
  });

  test("organization deployment", () => {
    const orgId = uuidv4();
    const mod: Mod = modComponentFactory({
      _deployment: {
        id: orgId,
        active: true,
        timestamp: timestampFactory(),
      },
    }) as any;

    // @ts-expect-error -- we are generating a test extension
    mod._recipe = {
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

    const { type, label } = getSharingSource({
      mod,
      organizations: testOrganizations,
      userScope: "test_scope",
      modComponents: [],
    });

    expect(type).toBe("Deployment");
    expect(label).toBe("test_org");
  });

  test("team mod", () => {
    const mod = defaultModDefinitionFactory();
    const orgId = uuidv4();

    mod.sharing.organizations = [orgId];

    const testOrganizations = [
      {
        id: orgId,
        name: "test_org",
        role: UserRole.admin,
      },
    ];

    const { type, label } = getSharingSource({
      mod,
      organizations: testOrganizations,
      userScope: "test_scope",
      modComponents: [],
    });

    expect(type).toBe("Team");
    expect(label).toBe("test_org");
  });

  test("public mod", () => {
    const mod: Mod = defaultModDefinitionFactory({
      sharing: sharingDefinitionFactory({ public: true }),
    }) as any;

    const { type, label } = getSharingSource({
      mod,
      organizations: [],
      userScope: "test_scope",
      modComponents: [],
    });

    expect(type).toBe("Public");
    expect(label).toBe("Public");
  });
});

describe("isExtension", () => {
  it("returns true for an extension", () => {
    const mod = modComponentFactory() as HydratedModComponent;
    expect(isStandaloneModComponent(mod)).toBe(true);
  });

  it("returns false for a recipe", () => {
    const mod = defaultModDefinitionFactory();
    expect(isStandaloneModComponent(mod)).toBe(false);
  });
});

describe("isUnavailableMod", () => {
  it("returns false for a recipe definition", () => {
    const mod = defaultModDefinitionFactory();
    expect(isUnavailableMod(mod)).toBe(false);
  });

  it("returns true for UnavailableRecipe", () => {
    const mod = {
      isStub: true,
    } as UnavailableMod;
    expect(isUnavailableMod(mod)).toBe(true);
  });

  it("returns false for an extension", () => {
    const mod = modComponentFactory() as HydratedModComponent;
    expect(isUnavailableMod(mod)).toBe(false);
  });
});

describe("normalizeModOptionsDefinition", () => {
  it("normalizes null", () => {
    expect(normalizeModOptionsDefinition(null)).toStrictEqual({
      schema: {
        type: "object",
        properties: {},
      },
      uiSchema: {
        "ui:order": ["*"],
      },
    });
  });

  it("normalizes frozen object with no ui:order", () => {
    // Root cause of https://github.com/pixiebrix/pixiebrix-app/issues/5396
    const original = freeze({
      schema: {
        type: "object",
        properties: freeze({}),
      },
      uiSchema: freeze({}),
    }) satisfies ModOptionsDefinition;

    expect(normalizeModOptionsDefinition(original)).toStrictEqual({
      schema: {
        type: "object",
        properties: {},
      },
      uiSchema: {
        "ui:order": ["*"],
      },
    });
  });

  it("normalizes legacy schema", () => {
    expect(
      normalizeModOptionsDefinition({
        schema: {
          foo: {
            type: "string",
          },
        },
      } as any),
    ).toStrictEqual({
      schema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        properties: {
          foo: {
            type: "string",
          },
        },
        required: ["foo"],
      },
      uiSchema: {
        "ui:order": ["foo", "*"],
      },
    });
  });
});
