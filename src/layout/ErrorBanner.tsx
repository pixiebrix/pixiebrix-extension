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

import React from "react";
import "./Banner.scss";

const errorMessages = new Map([
  [
    "ERR_BROWSER_ACTION_TOGGLE_SPECIAL_PAGE",
    "PixieBrix can’t run on internal browser pages",
  ],
  ["ERR_BROWSER_ACTION_TOGGLE", "PixieBrix could not run on the page"],
]);

const ErrorBanner: React.FunctionComponent = () => {
  const message = errorMessages.get(
    new URLSearchParams(location.search).get("error")
  );
  if (message) {
    return <div className="error-banner w-100">{message}</div>;
  }
};

export default ErrorBanner;
