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

import React, { MouseEvent } from "react";
import { sleep } from "@/utils";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";

const onReload = async (event: MouseEvent<HTMLElement>) => {
  if (event.shiftKey) {
    await browser.tabs.reload(browser.devtools.inspectedWindow.tabId);

    browser.runtime?.reload(); // Not guaranteed

    // We must wait before reloading or else the loading fails
    // https://github.com/pixiebrix/pixiebrix-extension/pull/2381
    await sleep(2000);
  }

  location.reload();
};

const ReloadButton: React.FunctionComponent = () => (
  <Button
    type="button"
    size="sm"
    variant="light"
    title="Shift-click to attempt to reload all contexts (in 2 seconds)"
    className="mt-auto"
    onClick={onReload}
  >
    <FontAwesomeIcon icon={faSync} />
  </Button>
);

export default ReloadButton;
