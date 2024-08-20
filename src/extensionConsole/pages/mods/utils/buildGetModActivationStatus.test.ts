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
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { type Mod } from "@/types/modTypes";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { nowTimestamp } from "@/utils/timeUtils";

describe("buildGetModActivationStatus", () => {
  it("returns inactive for a mod with no activated components", () => {
    const getActivationStatus = buildGetModActivationStatus([]);
    expect(getActivationStatus(modDefinitionFactory())).toBe("Inactive");
  });

  it("returns active for a mod with an activated component and no deployment", () => {
    const modMetadata = modMetadataFactory();
    const mod = modDefinitionFactory({
      metadata: modMetadata,
    });
    const activatedModComponents = [
      activatedModComponentFactory({ _recipe: modMetadata }),
    ];

    const getActivationStatus = buildGetModActivationStatus(
      activatedModComponents,
    );
    expect(getActivationStatus(mod)).toBe("Active");
  });

  it("returns active for a mod with an activated component and an active deployment", () => {
    const modMetadata = modMetadataFactory();
    const mod = modDefinitionFactory({
      metadata: modMetadata,
    });
    const activatedModComponents = [
      activatedModComponentFactory({
        _recipe: modMetadata,
        _deployment: {
          id: autoUUIDSequence(),
          timestamp: nowTimestamp(),
          active: true,
        },
      }),
    ];

    const getActivationStatus = buildGetModActivationStatus(
      activatedModComponents,
    );
    expect(getActivationStatus(mod)).toBe("Active");
  });

  it("returns paused for a mod with an activated component and a paused deployment", () => {
    const modMetadata = modMetadataFactory();
    const mod = modDefinitionFactory({
      metadata: modMetadata,
    });
    const activatedModComponents = [
      activatedModComponentFactory({
        _recipe: modMetadata,
        _deployment: {
          id: autoUUIDSequence(),
          timestamp: nowTimestamp(),
          active: false,
        },
      }),
    ];

    const getActivationStatus = buildGetModActivationStatus(
      activatedModComponents,
    );
    expect(getActivationStatus(mod)).toBe("Paused");
  });
});
