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

import { activateDeployments } from "@/extensionConsole/pages/deployments/activateDeployments";
import useAutoDeploy from "@/extensionConsole/pages/deployments/useAutoDeploy";
import { renderHook } from "@/extensionConsole/testHelpers";
import useFlags from "@/hooks/useFlags";
import useModPermissions from "@/mods/hooks/useModPermissions";
import { activatableDeploymentFactory } from "@/testUtils/factories/deploymentFactories";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import { modInstanceFactory } from "@/testUtils/factories/modInstanceFactories";
import { type AsyncDispatch } from "@/extensionConsole/store";

jest.mock("@/mods/hooks/useModPermissions");
jest.mock("@/hooks/useFlags");
jest.mock("@/extensionConsole/pages/deployments/activateDeployments");

const mockHooks = ({
  restricted = true,
  hasPermissions = true,
  activateDeploymentsResponse = jest.fn(),
}: {
  restricted?: boolean;
  hasPermissions?: boolean;
  activateDeploymentsResponse?: (dispatch: AsyncDispatch) => Promise<void>;
} = {}) => {
  jest.mocked(useFlags).mockImplementation(() => ({
    ...jest.requireActual("@/hooks/useFlags"),
    restrict: () => restricted,
  }));

  jest.mocked(useModPermissions).mockImplementation(() => ({
    hasPermissions,
    requestPermissions: jest.fn(),
  }));

  jest.mocked(activateDeployments).mockReturnValue(activateDeploymentsResponse);
};

describe("useAutoDeploy", () => {
  describe("loading deployments", () => {
    it("should return true if the deployments are still being loaded", () => {
      mockHooks();

      const activatableDeployments: ActivatableDeployment[] | undefined =
        undefined;
      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result } = renderHook(() =>
        useAutoDeploy({
          activatableDeployments,
          modInstances,
          extensionUpdateRequired,
        }),
      );

      expect(result.current.isAutoDeploying).toBe(true);
    });

    it("returns false if there are no deployments", () => {
      mockHooks();

      const activatableDeployments: ActivatableDeployment[] = [];
      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result } = renderHook(() =>
        useAutoDeploy({
          activatableDeployments,
          modInstances,
          extensionUpdateRequired,
        }),
      );

      expect(result.current.isAutoDeploying).toBe(false);
    });
  });

  describe("activating deployments", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return true if the deployments are being automatically deployed; activateDeployments should be called; returns false once deployments are activated", async () => {
      mockHooks();

      const activatableDeployments: ActivatableDeployment[] = [
        activatableDeploymentFactory(),
      ];
      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result, waitForValueToChange } = renderHook(() =>
        useAutoDeploy({
          activatableDeployments,
          modInstances,
          extensionUpdateRequired,
        }),
      );

      expect(result.current.isAutoDeploying).toBe(true);
      expect(activateDeployments).toHaveBeenCalledWith({
        activatableDeployments,
        modInstances,
        reloadMode: "queue",
      });

      await waitForValueToChange(() => result.current.isAutoDeploying);
      expect(result.current.isAutoDeploying).toBe(false);
    });

    it("should return false once the deployments have been fetched and activated", async () => {
      mockHooks();

      const activatableDeployments: ActivatableDeployment[] = [
        activatableDeploymentFactory(),
      ];
      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result, waitForValueToChange } = renderHook(() =>
        useAutoDeploy({
          activatableDeployments,
          modInstances,
          extensionUpdateRequired,
        }),
      );

      expect(result.current.isAutoDeploying).toBe(true);

      await waitForValueToChange(() => result.current.isAutoDeploying);

      expect(result.current.isAutoDeploying).toBe(false);
    });

    it("should only attempt to activate deployments once", async () => {
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });

      mockHooks({
        async activateDeploymentsResponse() {
          await promise;
        },
      });

      const activatableDeployment: ActivatableDeployment =
        activatableDeploymentFactory();

      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result, rerender, waitForValueToChange } = renderHook(
        ({ activatableDeployments }) =>
          useAutoDeploy({
            activatableDeployments,
            modInstances,
            extensionUpdateRequired,
          }),
        {
          initialProps: {
            activatableDeployments: [activatableDeployment],
          },
        },
      );

      rerender({ activatableDeployments: [activatableDeployment] });

      expect(activateDeployments).toHaveBeenCalledTimes(1);

      await waitForValueToChange(() => result.current.isAutoDeploying);

      expect(result.current.isAutoDeploying).toBe(false);
    });
  });

  describe("permissions", () => {
    it("should return false if the user has not granted required permissions to the Extensions", () => {
      mockHooks({ hasPermissions: false });

      const activatableDeployments: ActivatableDeployment[] = [
        activatableDeploymentFactory(),
      ];
      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result } = renderHook(() =>
        useAutoDeploy({
          activatableDeployments,
          modInstances,
          extensionUpdateRequired,
        }),
      );

      expect(result.current.isAutoDeploying).toBe(false);
    });

    it("should return false if the user has uninstall permissions", () => {
      mockHooks({ restricted: false });

      const activatableDeployments: ActivatableDeployment[] = [
        activatableDeploymentFactory(),
      ];
      const modInstances = [modInstanceFactory(), modInstanceFactory()];
      const extensionUpdateRequired = false;

      const { result } = renderHook(() =>
        useAutoDeploy({
          activatableDeployments,
          modInstances,
          extensionUpdateRequired,
        }),
      );

      expect(result.current.isAutoDeploying).toBe(false);
    });
  });
});
