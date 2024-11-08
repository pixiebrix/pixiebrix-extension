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

import { render, screen, waitFor } from "../../extensionConsole/testHelpers";
import { TrialAwareButton } from "./TrialAwareButton";
import { appApiMock } from "../../testUtils/appApiMock";
import { registryIdFactory } from "../../testUtils/factories/stringFactories";
import React from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { API_PATHS } from "../../data/service/urlPaths";
import { organizationResponseFactory } from "../../testUtils/factories/organizationFactories";
import { type Timestamp } from "../../types/stringTypes";

describe("TrialAwareButton", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  it("renders", async () => {
    appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, []);
    render(<TrialAwareButton modId={registryIdFactory()} />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders children", async () => {
    appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, []);
    render(
      <TrialAwareButton modId={registryIdFactory()}>Hello</TrialAwareButton>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("Hello");
  });

  it("renders icon", async () => {
    appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, []);
    render(
      <TrialAwareButton modId={registryIdFactory()} icon={faPlus}>
        Hello
      </TrialAwareButton>,
    );

    // Hidden because we don't show the icon to screen readers
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });

  describe("no trial_end_timestamp", () => {
    it("is enabled when the team does not have a trial_end_timestamp if the modId is not of the same scope as the organization", async () => {
      const organizationScope = "@foo";
      const modId = registryIdFactory();
      expect(modId.startsWith(organizationScope)).toBeFalse();

      appApiMock
        .onGet(API_PATHS.ORGANIZATIONS)
        .reply(200, [
          organizationResponseFactory({ scope: organizationScope }),
        ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("is enabled when the team does not have a trial_end_timestamp if the modId is of the same scope as the organization", async () => {
      const organizationScope = "test";
      const modId = registryIdFactory();
      expect(modId.startsWith(organizationScope)).toBeTrue();

      appApiMock
        .onGet(API_PATHS.ORGANIZATIONS)
        .reply(200, [
          organizationResponseFactory({ scope: organizationScope }),
        ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeEnabled();
    });
  });

  describe("trial_end_timestamp in the future", () => {
    it("is enabled when the team has a trial_end_timestamp in the future and the modId is not of the same scope as the organization", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-01"));

      const organizationScope = "@foo";
      const modId = registryIdFactory();
      expect(modId.startsWith(organizationScope)).toBeFalse();

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, [
        organizationResponseFactory({
          trial_end_timestamp: "2023-01-02T00:00:00Z" as Timestamp,
          scope: organizationScope,
        }),
      ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("is enabled when the team has a trial_end_timestamp in the future and the modId is of the same scope as the organization", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-01"));

      const organizationScope = "test";
      const modId = registryIdFactory();
      expect(modId.startsWith(organizationScope)).toBeTrue();

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, [
        organizationResponseFactory({
          trial_end_timestamp: "2023-01-02T00:00:00Z" as Timestamp,
          scope: organizationScope,
        }),
      ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeEnabled();
    });
  });

  describe("trial_end_timestamp in the past", () => {
    it("is enabled when the team has a trial_end_timestamp in the past and the modId is not of the same scope as the organization", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-02"));

      const organizationScope = "@foo";
      const modId = registryIdFactory();
      expect(modId.startsWith(organizationScope)).toBeFalse();

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, [
        organizationResponseFactory({
          trial_end_timestamp: "2023-01-01T00:00:00Z" as Timestamp,
        }),
      ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("is disabled when the team has a trial_end_timestamp in the past and the modId is of the same scope as the organization", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-02"));

      const organizationScope = "test";
      const modId = registryIdFactory();
      expect(modId.startsWith(organizationScope)).toBeTrue();

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, [
        organizationResponseFactory({
          trial_end_timestamp: "2023-01-01T00:00:00Z" as Timestamp,
          scope: organizationScope,
        }),
      ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is disabled when any team has a trial_end_timestamp in the past and the modId is of the same scope as any organization", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-02"));

      const organization1Scope = "test";
      const organization2Scope = "@foo";
      const modId = registryIdFactory();
      expect(modId.startsWith(organization1Scope)).toBeTrue();

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, [
        organizationResponseFactory({
          trial_end_timestamp: "2023-01-01T00:00:00Z" as Timestamp,
          scope: organization2Scope,
        }),
        organizationResponseFactory({
          scope: organization1Scope,
        }),
      ]);

      render(<TrialAwareButton modId={modId} />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
