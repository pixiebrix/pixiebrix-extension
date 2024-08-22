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

import buildGetModVersionStatus from "@/extensionConsole/pages/mods/utils/buildGetModVersionStatus";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { normalizeSemVerString } from "@/types/helpers";
import { mapModComponentToUnavailableMod } from "@/utils/modUtils";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

describe("buildGetModVersionStatus", () => {
  it("handles no activated mod components", () => {
    const getVersionStatus = buildGetModVersionStatus([]);
    expect(getVersionStatus(modDefinitionFactory())).toStrictEqual({
      hasUpdate: false,
      activatedModVersion: null,
    });
  });

  it("handles unavailable mod", () => {
    const version = normalizeSemVerString("1.2.3");
    const modMetadata = modMetadataFactory({ version });
    const unavailableModComponent = activatedModComponentFactory({
      _recipe: modMetadata,
    });

    const getVersionStatus = buildGetModVersionStatus([
      unavailableModComponent,
      activatedModComponentFactory({ _recipe: modMetadataFactory() }),
      activatedModComponentFactory({ _recipe: modMetadataFactory() }),
    ]);

    expect(
      getVersionStatus(
        mapModComponentToUnavailableMod(unavailableModComponent),
      ),
    ).toStrictEqual({
      hasUpdate: false,
      activatedModVersion: version,
    });
  });

  test.each`
    activatedModVersion | latestModVersion | expectedHasUpdate
    ${"1.2.3"}          | ${"1.2.0"}       | ${false}
    ${"1.2.3"}          | ${"1.2.3"}       | ${false}
    ${"1.2.3"}          | ${"1.2.4"}       | ${true}
    ${"1.2.3"}          | ${"1.3.0"}       | ${true}
    ${"1.2.3"}          | ${"2.0.0"}       | ${true}
  `(
    "handles activatedModVersion: $activatedModVersion, latestModVersion: $modVersion",
    ({ activatedModVersion, latestModVersion, expectedHasUpdate }) => {
      const modId = registryIdFactory();
      const getVersionStatus = buildGetModVersionStatus([
        activatedModComponentFactory({
          _recipe: modMetadataFactory({
            id: modId,
            version: normalizeSemVerString(activatedModVersion),
          }),
        }),
      ]);

      expect(
        getVersionStatus(
          modDefinitionFactory({
            metadata: modMetadataFactory({
              id: modId,
              version: normalizeSemVerString(latestModVersion),
            }),
          }),
        ),
      ).toStrictEqual({
        hasUpdate: expectedHasUpdate,
        activatedModVersion: normalizeSemVerString(activatedModVersion),
      });
    },
  );
});
