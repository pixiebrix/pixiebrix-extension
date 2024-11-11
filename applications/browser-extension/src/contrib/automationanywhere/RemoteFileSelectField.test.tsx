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

import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { render, screen, userEvent } from "@/pageEditor/testHelpers";
import { waitFor } from "@testing-library/react";
import selectEvent from "react-select-event";
import React from "react";
import RemoteFileSelectField from "@/contrib/automationanywhere/RemoteFileSelectField";
import { type WorkspaceType } from "@/contrib/automationanywhere/contract";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";

const bots1 = [
  {
    value: "123",
    label: "Bot 1",
  },
  {
    value: "456",
    label: "Bot 2",
  },
];

const bots2 = [
  {
    value: "789",
    label: "Bot 3",
  },
  {
    value: "1011",
    label: "Bot 4",
  },
];

const searchBotsMock = jest.fn();

const LABEL_TEXT = "Test Bot";
const PLACEHOLDER_TEXT = "Type to search Bots...";
const DESCRIPTION_TEXT = "The Automation Anywhere bot to run";

const controlRoomConfig1 = sanitizedIntegrationConfigFactory();
const controlRoomConfig2 = sanitizedIntegrationConfigFactory();

function renderComponent({
  workspaceTypeFieldValue,
  controlRoomConfig,
}: {
  workspaceTypeFieldValue: WorkspaceType;
  controlRoomConfig: SanitizedIntegrationConfig;
}) {
  const { rerender } = render(
    <RemoteFileSelectField
      fileIdFieldName={"fileId"}
      label={LABEL_TEXT}
      description={DESCRIPTION_TEXT}
      placeholder={PLACEHOLDER_TEXT}
      workspaceTypeFieldValue={workspaceTypeFieldValue}
      controlRoomConfig={controlRoomConfig}
      optionsFactory={searchBotsMock}
      extraFactoryArgs={{ workspaceType: workspaceTypeFieldValue }}
    />,
    {
      initialValues: {
        fileId: null,
      },
    },
  );

  function rerenderComponent({
    workspaceTypeFieldValue,
    controlRoomConfig,
  }: {
    workspaceTypeFieldValue: WorkspaceType;
    controlRoomConfig: SanitizedIntegrationConfig;
  }) {
    rerender(
      <RemoteFileSelectField
        fileIdFieldName={"fileId"}
        label={LABEL_TEXT}
        description={DESCRIPTION_TEXT}
        placeholder={PLACEHOLDER_TEXT}
        workspaceTypeFieldValue={workspaceTypeFieldValue}
        controlRoomConfig={controlRoomConfig}
        optionsFactory={searchBotsMock}
        extraFactoryArgs={{ workspaceType: workspaceTypeFieldValue }}
      />,
    );
  }

  return { rerenderComponent };
}

async function waitForElementToLoad() {
  await waitFor(async () => {
    // Can't use findByPlaceholderText with react-select, placeholder is a separate div
    await expect(
      screen.findByText(PLACEHOLDER_TEXT),
    ).resolves.toBeInTheDocument();
  });
  return screen.getByRole<HTMLInputElement>("combobox");
}

describe("RemoteFileSelectField", () => {
  afterEach(() => {
    searchBotsMock.mockReset();
  });

  it("loads initial options", async () => {
    searchBotsMock.mockResolvedValue(bots1);
    renderComponent({
      workspaceTypeFieldValue: "private",
      controlRoomConfig: controlRoomConfig1,
    });

    const selectElement = await waitForElementToLoad();
    selectEvent.openMenu(selectElement);
    await expect(screen.findByText("Bot 1")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bot 2")).toBeInTheDocument();

    expect(searchBotsMock).toHaveBeenCalledWith(
      controlRoomConfig1,
      expect.objectContaining({ workspaceType: "private" }),
    );
    expect(searchBotsMock).toHaveBeenCalledOnce();
  });

  it("re-loads options when the integration config changes", async () => {
    searchBotsMock.mockResolvedValue(bots1);
    const { rerenderComponent } = renderComponent({
      workspaceTypeFieldValue: "private",
      controlRoomConfig: controlRoomConfig1,
    });

    const selectElement = await waitForElementToLoad();
    selectEvent.openMenu(selectElement);
    await expect(screen.findByText("Bot 1")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bot 2")).toBeInTheDocument();

    expect(searchBotsMock).toHaveBeenCalledWith(
      controlRoomConfig1,
      expect.objectContaining({ workspaceType: "private" }),
    );
    expect(searchBotsMock).toHaveBeenCalledOnce();

    searchBotsMock.mockResolvedValue(bots2);
    rerenderComponent({
      workspaceTypeFieldValue: "private",
      controlRoomConfig: controlRoomConfig2,
    });

    const selectElement2 = await waitForElementToLoad();
    selectEvent.openMenu(selectElement2);
    await expect(screen.findByText("Bot 3")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bot 4")).toBeInTheDocument();

    expect(searchBotsMock).toHaveBeenCalledWith(
      controlRoomConfig2,
      expect.objectContaining({ workspaceType: "private" }),
    );
    expect(searchBotsMock).toHaveBeenCalledTimes(2);
  });

  it("re-loads options when the workspace type changes", async () => {
    searchBotsMock.mockResolvedValue(bots1);
    const { rerenderComponent } = renderComponent({
      workspaceTypeFieldValue: "private",
      controlRoomConfig: controlRoomConfig1,
    });

    const selectElement = await waitForElementToLoad();
    selectEvent.openMenu(selectElement);
    await expect(screen.findByText("Bot 1")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bot 2")).toBeInTheDocument();

    expect(searchBotsMock).toHaveBeenCalledWith(
      controlRoomConfig1,
      expect.objectContaining({ workspaceType: "private" }),
    );
    expect(searchBotsMock).toHaveBeenCalledOnce();

    searchBotsMock.mockResolvedValue(bots2);
    rerenderComponent({
      workspaceTypeFieldValue: "public",
      controlRoomConfig: controlRoomConfig1,
    });

    const selectElement2 = await waitForElementToLoad();
    selectEvent.openMenu(selectElement2);
    await expect(screen.findByText("Bot 3")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bot 4")).toBeInTheDocument();

    expect(searchBotsMock).toHaveBeenCalledWith(
      controlRoomConfig1,
      expect.objectContaining({ workspaceType: "public" }),
    );
    expect(searchBotsMock).toHaveBeenCalledTimes(2);
  });

  it("re-loads options when the search query changes", async () => {
    const allBots = [...bots1, ...bots2];
    searchBotsMock.mockImplementation(async (config, { query }) =>
      allBots.filter((bot) => bot.label.includes(query)),
    );

    renderComponent({
      workspaceTypeFieldValue: "private",
      controlRoomConfig: controlRoomConfig1,
    });

    const selectElement = await waitForElementToLoad();
    selectEvent.openMenu(selectElement);
    await expect(screen.findByText("Bot 1")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bot 2")).toBeInTheDocument();
    expect(screen.getByText("Bot 3")).toBeInTheDocument();
    expect(screen.getByText("Bot 4")).toBeInTheDocument();

    await userEvent.type(selectElement, "1");
    await expect(screen.findByText("Bot 1")).resolves.toBeInTheDocument();
    expect(screen.queryByText("Bot 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 3")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 4")).not.toBeInTheDocument();

    await userEvent.clear(selectElement);
    await userEvent.type(selectElement, "2");
    await expect(screen.findByText("Bot 2")).resolves.toBeInTheDocument();
    expect(screen.queryByText("Bot 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 3")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 4")).not.toBeInTheDocument();

    await userEvent.clear(selectElement);
    await userEvent.type(selectElement, "3");
    await expect(screen.findByText("Bot 3")).resolves.toBeInTheDocument();
    expect(screen.queryByText("Bot 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 4")).not.toBeInTheDocument();

    await userEvent.clear(selectElement);
    await userEvent.type(selectElement, "4");
    await expect(screen.findByText("Bot 4")).resolves.toBeInTheDocument();
    expect(screen.queryByText("Bot 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Bot 3")).not.toBeInTheDocument();
  });
});
