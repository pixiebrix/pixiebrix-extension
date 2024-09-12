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
import TeamTrialBanner from "@/extensionConsole/pages/TeamTrialBanner";
import { render, screen, waitFor } from "@/extensionConsole/testHelpers";
import { organizationFactory } from "@/testUtils/factories/organizationFactories";
import { type Timestamp } from "@/types/stringTypes";
import { API_PATHS } from "@/data/service/urlPaths";
import { appApiMock } from "@/testUtils/appApiMock";

describe("TeamTrialBanner", () => {
  const today = new Date().getDate();

  const yesterday = new Date(
    new Date().setDate(today - 1),
  ).toISOString() as Timestamp;

  const tomorrow = new Date(
    new Date().setDate(today + 1),
  ).toISOString() as Timestamp;

  beforeEach(() => {
    appApiMock.reset();
  });

  describe("when the user is not on a team trial", () => {
    it("does not render the banner", async () => {
      const mockOrganizations = [organizationFactory()];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(
        screen.queryByText(/Your team trial is in progress./),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Your team trial is expired!/),
      ).not.toBeInTheDocument();
    });
  });

  describe("when the user is on an in progress team trial", () => {
    it("renders the banner", async () => {
      const mockOrganizations = [
        organizationFactory({
          trial_end_timestamp: tomorrow,
        }),
      ];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(
        screen.getByText(/Your team trial is in progress./),
      ).toBeInTheDocument();
    });

    it("renders the in progress message when any team is in progress and none are expired", async () => {
      const mockOrganizations = [
        organizationFactory({
          trial_end_timestamp: tomorrow,
        }),
        organizationFactory(),
      ];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(
        screen.getByText(/Your team trial is in progress./),
      ).toBeInTheDocument();
    });

    it("renders the trial call to action link when the user is on an in progress team trial", async () => {
      const mockOrganizations = [
        organizationFactory({
          trial_end_timestamp: tomorrow,
        }),
      ];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(screen.getByRole("link")).toHaveTextContent("here.");
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://calendly.com/pixiebrix-mike/20min",
      );
    });
  });

  describe("when the user is on an expired team trial", () => {
    it("renders the banner", async () => {
      const mockOrganizations = [
        organizationFactory({
          trial_end_timestamp: yesterday,
        }),
      ];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(
        screen.getByText(/Your team trial is expired!/),
      ).toBeInTheDocument();
    });

    it("renders the expired message even if other teams are not expired", async () => {
      const mockOrganizations = [
        organizationFactory({
          trial_end_timestamp: tomorrow,
        }),
        organizationFactory({
          trial_end_timestamp: yesterday,
        }),
        organizationFactory(),
      ];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(
        screen.getByText(/Your team trial is expired!/),
      ).toBeInTheDocument();
    });

    it("renders the trial call to action link when the user is on an expired team trial", async () => {
      const mockOrganizations = [
        organizationFactory({
          trial_end_timestamp: yesterday,
        }),
      ];

      appApiMock.onGet(API_PATHS.ORGANIZATIONS).reply(200, mockOrganizations);

      render(<TeamTrialBanner />);

      await waitFor(() => {
        expect(appApiMock.history.get).toHaveLength(1);
      });

      expect(screen.getByRole("link")).toHaveTextContent("here.");
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "https://calendly.com/pixiebrix-mike/20min",
      );
    });
  });
});
