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

import React from "react";
import { appApiMock } from "@/testUtils/appApiMock";
import { render, renderHook } from "@/pageEditor/testHelpers";
import useFlags from "@/hooks/useFlags";
import { waitForEffect } from "@/testUtils/testHelpers";
import { TEST_setAuthData, TEST_triggerListeners } from "@/auth/authStorage";
import { tokenAuthDataFactory } from "@/testUtils/factories/authFactories";
// eslint-disable-next-line no-restricted-imports -- test file
import { TEST_deleteFeatureFlagsCache } from "@/auth/featureFlagStorage";
import {
  featureFlagFactory,
  UNSAFE_assumeFeatureFlag,
} from "@/testUtils/factories/featureFlagFactories";
import {
  mapRestrictedFeatureToFeatureFlag,
  RestrictedFeatures,
} from "@/auth/featureFlags";
import { API_PATHS } from "@/data/service/urlPaths";

const testFlag = featureFlagFactory();

const TestComponent: React.FC<React.PropsWithChildren<{ name: string }>> = ({
  name,
  children,
}) => {
  const { flagOn } = useFlags();

  return (
    <div>
      Test Component {name}
      {flagOn(UNSAFE_assumeFeatureFlag(`test-flag-${name}`)) && (
        <div>Test flag is on for {name}</div>
      )}
      {children}
    </div>
  );
};

describe("useFlags", () => {
  beforeEach(async () => {
    appApiMock.reset();
    await TEST_deleteFeatureFlagsCache();
  });

  it("only fetches once for multiple instances of the hook in nested/sibling components", async () => {
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: [
        UNSAFE_assumeFeatureFlag("test-flag-parent"),
        UNSAFE_assumeFeatureFlag("test-flag-child1"),
      ],
    });

    const { rerender } = render(
      <TestComponent name="parent">
        <TestComponent name="child1" />
        <TestComponent name="child2" />
      </TestComponent>,
    );

    await waitForEffect();
    // Make sure we only fetched once
    expect(appApiMock.history.get).toHaveLength(1);

    // Mount another component instance (grandchild1), so that another
    // subscriber is added to the query in the hook
    rerender(
      <TestComponent name="parent">
        <TestComponent name="child1">
          <TestComponent name="grandchild1" />
        </TestComponent>
        <TestComponent name="child2" />
      </TestComponent>,
    );

    await waitForEffect();
    // Make sure we've still only fetched once
    expect(appApiMock.history.get).toHaveLength(1);
  });

  it("re-fetches flags when the auth data changes", async () => {
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: ["test-flag-parent", "test-flag-child1"],
    });

    const tokenData = tokenAuthDataFactory();

    await TEST_setAuthData(tokenData);

    render(
      <TestComponent name="parent">
        <TestComponent name="child1" />
        <TestComponent name="child2" />
      </TestComponent>,
    );

    await waitForEffect();
    // Make sure we only fetched once
    expect(appApiMock.history.get).toHaveLength(1);

    // Simulate a change in auth data
    TEST_triggerListeners(tokenData);

    await waitForEffect();
    // Should have fetched again since the auth data has changed
    expect(appApiMock.history.get).toHaveLength(2);
  });

  describe("flagOn", () => {
    it("returns true if flag is present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: [testFlag],
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.flagOn(testFlag)).toBe(true);
      });
    });

    it("returns false if flag is not present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: [],
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.flagOn(testFlag)).toBe(false);
      });
    });
  });

  describe("flagOff", () => {
    it("returns true if flag is not present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: [],
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.flagOff(testFlag)).toBe(true);
      });
    });

    it("returns false if flag is present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: [testFlag],
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.flagOff(testFlag)).toBe(false);
      });
    });
  });

  describe("permit", () => {
    it("returns true if restricted flag for area is not present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: mapRestrictedFeatureToFeatureFlag(RestrictedFeatures.WORKSHOP),
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.permit(RestrictedFeatures.PAGE_EDITOR)).toBe(
          true,
        );
      });
    });

    it("returns false if restricted flag for area is present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: [
          RestrictedFeatures.WORKSHOP,
          RestrictedFeatures.PAGE_EDITOR,
        ].map((x) => mapRestrictedFeatureToFeatureFlag(x)),
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.permit(RestrictedFeatures.PAGE_EDITOR)).toBe(
          false,
        );
      });
    });
  });

  describe("restrict", () => {
    it("returns true if restricted flag for area is present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: [
          RestrictedFeatures.WORKSHOP,
          RestrictedFeatures.PAGE_EDITOR,
        ].map((x) => mapRestrictedFeatureToFeatureFlag(x)),
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.restrict(RestrictedFeatures.PAGE_EDITOR)).toBe(
          true,
        );
      });
    });

    it("returns false if restricted flag for area is not present", async () => {
      appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
        flags: ["restricted-workshop"],
      });

      const { result, waitFor } = renderHook(() => useFlags());

      await waitFor(() => {
        expect(result.current.restrict(RestrictedFeatures.PAGE_EDITOR)).toBe(
          false,
        );
      });
    });
  });
});
