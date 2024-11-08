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

import React, { type MouseEvent } from "react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { sleep } from "@/utils/timeUtils";
import { inspectedTab } from "@/pageEditor/context/connection";

const onReload = async (event: MouseEvent<HTMLElement>) => {
  if (event.shiftKey) {
    await browser.tabs.reload(inspectedTab.tabId);

    browser.runtime?.reload(); // Not guaranteed

    // We must wait before reloading or else the loading fails
    // https://github.com/pixiebrix/pixiebrix-extension/pull/2381
    await sleep(500);
  }

  location.reload();
};

const ReloadButton: React.FunctionComponent<{ className?: string }> = ({
  className,
}) => (
  <Button
    size="sm"
    type="button"
    variant="light"
    title="Reload page editor. Shift-click to also reload page and extension (button only shown in dev builds)"
    className={className}
    onClick={onReload}
  >
    <FontAwesomeIcon icon={faSync} fixedWidth />
  </Button>
);

export default ReloadButton;
