/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { liftContentScript } from "@/contentScript/backgroundProtocol";
import { IRobotSDK } from "@uipath/robot/dist/iRobotSDK";
import UiPathRobot from "@/contrib/uipath/UiPathRobot";

let _robot: IRobotSDK;

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

    UiPathRobot.on("consent-prompt", (consentCode: string) => {
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
  return _initRobot();
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
