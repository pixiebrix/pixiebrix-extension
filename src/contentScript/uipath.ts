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

import type { IRobotSDK } from "@uipath/robot/dist/iRobotSDK";
import type { RobotProcess } from "@uipath/robot/dist/models";

let _robot: IRobotSDK;

type InitResponse = {
  missingComponents: boolean;
  available: boolean;
  consentCode?: string;
};

export async function initRobot(): Promise<InitResponse> {
  if (_robot) {
    return {
      missingComponents: false,
      available: true,
    };
  }

  const { UiPathRobot } = await import(
    /* webpackChunkName: "uipath-robot" */ "@/contrib/uipath/UiPathRobot"
  );

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

export async function getProcesses(): Promise<RobotProcess[]> {
  if (!_robot) {
    throw new Error("UiPath not initialized");
  }

  return _robot.getProcesses();
}
