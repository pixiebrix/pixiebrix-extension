/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { UiPathRobot } from "@uipath/robot";
import { liftContentScript } from "@/contentScript/backgroundProtocol";

// UiPathRobot.settings.appOrigin = "PixieBrix";

let _robot: any;

type InitResponse = {
  missingComponents: boolean;
  available: boolean;
  consentCode?: string;
};

async function _initRobot(): Promise<InitResponse> {
  if (_robot) {
    return {
      missingComponents: false,
      available: true,
    };
  }

  return new Promise((resolve) => {
    UiPathRobot.on("missing-components", () => {
      resolve({
        missingComponents: true,
        available: false,
      });
    });

    UiPathRobot.on("consent-prompt", (consentCode) => {
      resolve({
        missingComponents: false,
        available: false,
        consentCode,
      });
    });

    _robot = UiPathRobot.init();

    resolve({
      missingComponents: false,
      available: true,
    });
  });
}

export const initRobot = liftContentScript("UIPATH_INIT", async () => {
  return await _initRobot();
});

export const getProcesses = liftContentScript(
  "UIPATH_GET_PROCESSES",
  async () => {
    if (!_robot) {
      throw new Error("UiPath not initialized");
    }
    return _robot.getProcesses();
  }
);
