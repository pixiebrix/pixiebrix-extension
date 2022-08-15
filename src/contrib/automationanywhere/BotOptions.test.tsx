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

import React from "react";
import {
  activeDevToolContextFactory,
  menuItemFormStateFactory,
} from "@/testUtils/factories";
import { OutputKey } from "@/core";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { render } from "@testing-library/react";
import { PageEditorTabContext } from "@/pageEditor/context";
import { Formik } from "formik";
import { CONTROL_ROOM_SERVICE_ID } from "@/services/constants";
import { AUTOMATION_ANYWHERE_RUN_BOT_ID } from "@/contrib/automationanywhere/RunBot";
import BotOptions from "@/contrib/automationanywhere/BotOptions";
import { useAuthOptions } from "@/hooks/auth";

jest.mock("webext-detect-page", () => ({
  isDevToolsPage: () => true,
  isExtensionContext: () => true,
  isBackground: () => false,
  isContentScript: () => false,
}));

jest.mock("@/services/useDependency", () =>
  jest.fn().mockReturnValue({
    // Pass minimal arguments
    config: undefined,
    service: undefined,
    hasPermissions: true,
    requestPermissions: jest.fn(),
  })
);
jest.mock("@/hooks/auth", () => ({
  useAuthOptions: jest.fn().mockReturnValue([[], jest.fn()]),
}));
jest.mock("@/hooks/auth");
jest.mock("@/contentScript/messenger/api");
jest.mock("@/background/messenger/api");

const useAuthOptionsMock = useAuthOptions as jest.Mock;

function makeBaseState() {
  const baseFormState = menuItemFormStateFactory();
  baseFormState.services = [
    {
      id: CONTROL_ROOM_SERVICE_ID,
      outputKey: "automationAnywhere" as OutputKey,
    },
  ];
  baseFormState.extension.blockPipeline = [
    {
      id: AUTOMATION_ANYWHERE_RUN_BOT_ID,
      config: {
        service: null,
        releaseKey: null,
        inputArguments: {},
      },
    },
  ];
  return baseFormState;
}

function renderOptions(formState: FormState = makeBaseState()) {
  return render(
    <PageEditorTabContext.Provider value={activeDevToolContextFactory()}>
      <Formik onSubmit={jest.fn()} initialValues={formState}>
        <BotOptions name="extension.blockPipeline.0" configKey="config" />
      </Formik>
    </PageEditorTabContext.Provider>
  );
}

describe("BotOptions", () => {
  it("should require selected integration", async () => {
    const result = renderOptions();
    expect(result.container).toMatchSnapshot();
  });
});
