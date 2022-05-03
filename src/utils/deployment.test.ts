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
  checkExtensionUpdateRequired,
  isDeploymentActive,
  makeUpdatedFilter,
} from "./deployment";
import { deploymentFactory, extensionFactory } from "@/testUtils/factories";
import { validateTimestamp } from "@/types/helpers";

describe("makeUpdatedFilter", () => {
  test.each([[{ restricted: true }, { restricted: false }]])(
    "unmatched deployment",
    ({ restricted }) => {
      const extensions = [extensionFactory()];

      const filter = makeUpdatedFilter(extensions, { restricted });
      expect(filter(deploymentFactory())).toBeTrue();
    }
  );

  test.each([[{ restricted: true }, { restricted: false }]])(
    "matched up-to-date deployment",
    ({ restricted }) => {
      const deployment = deploymentFactory();

      const extensions = [
        extensionFactory({
          _deployment: {
            id: deployment.id,
            timestamp: deployment.updated_at,
            active: true,
          },
        }),
      ];

      const filter = makeUpdatedFilter(extensions, { restricted });
      expect(filter(deployment)).toBeFalse();
    }
  );

  test.each([[{ restricted: true }, { restricted: false }]])(
    "matched stale deployment",
    ({ restricted }) => {
      const deployment = deploymentFactory();

      const extensions = [
        extensionFactory({
          _deployment: {
            id: deployment.id,
            timestamp: "2020-10-07T12:52:16.189Z",
            active: true,
          },
        }),
      ];

      const filter = makeUpdatedFilter(extensions, { restricted });
      expect(filter(deployment)).toBeTrue();
    }
  );

  test("matched blueprint for restricted user", () => {
    const deployment = deploymentFactory();

    const extensions = [
      extensionFactory({
        _deployment: undefined,
        _recipe: {
          ...deployment.package.config.metadata,
          updated_at: validateTimestamp(deployment.updated_at),
          // `sharing` doesn't impact the predicate. Pass an arbitrary value
          sharing: undefined,
        },
      }),
    ];

    const filter = makeUpdatedFilter(extensions, { restricted: true });
    expect(filter(deployment)).toBeTrue();
  });

  test("matched blueprint for unrestricted user / developer", () => {
    const deployment = deploymentFactory();

    const extensions = [
      extensionFactory({
        _deployment: undefined,
        _recipe: {
          ...deployment.package.config.metadata,
          // The factory produces version "1.0.1"
          version: "1.0.1",
          updated_at: validateTimestamp(deployment.updated_at),
          // `sharing` doesn't impact the predicate. Pass an arbitrary value
          sharing: undefined,
        },
      }),
    ];

    const filter = makeUpdatedFilter(extensions, { restricted: false });
    expect(filter(deployment)).toBeFalse();
  });
});

describe("checkExtensionUpdateRequired", () => {
  test("no deployments", () => {
    expect(checkExtensionUpdateRequired([])).toBeFalse();
  });

  test("update required", () => {
    const deployment = deploymentFactory();
    (deployment.package.config.metadata.extensionVersion as any) = ">=99.99.99";

    expect(checkExtensionUpdateRequired([deployment])).toBeTrue();
  });

  test("update not required", () => {
    const deployment = deploymentFactory();
    (deployment.package.config.metadata.extensionVersion as any) = `>=${
      browser.runtime.getManifest().version
    }`;
    expect(checkExtensionUpdateRequired([deployment])).toBeFalse();
  });
});

describe("isDeploymentActive", () => {
  test("not a deployment", () => {
    expect(isDeploymentActive(extensionFactory())).toBeTrue();
  });

  test("legacy deployment", () => {
    const deployment = deploymentFactory();

    const extension = extensionFactory({
      _deployment: {
        id: deployment.id,
        timestamp: deployment.updated_at,
        // Legacy deployments don't have an `active` field
      },
    });

    expect(isDeploymentActive(extension)).toBeTrue();
  });

  test.each([[{ active: true }, { active: false }]])(
    "deployment",
    ({ active }) => {
      const deployment = deploymentFactory();

      const extension = extensionFactory({
        _deployment: {
          id: deployment.id,
          timestamp: deployment.updated_at,
          active,
        },
      });

      expect(isDeploymentActive(extension)).toBe(active);
    }
  );
});
