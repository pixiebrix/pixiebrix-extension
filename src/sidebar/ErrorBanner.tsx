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
import useContextInvalidated from "@/hooks/useContextInvalidated";

// Note, it's currently impossible to have a "Reload sidebar" button because it can
// only be done from the content script + contact to the outside world is lost after
// context invalidation (chrome.runtime and chrome.tabs become undefined)
const ErrorBanner: React.VFC = () => {
  const wasContextInvalidated = useContextInvalidated();
  if (!wasContextInvalidated) {
    return null;
  }

  return (
    <div className="p-3 alert-danger">
      PixieBrix was updated or restarted. <br />
      Close and reopen the sidebar to continue.
    </div>
  );
};

export default ErrorBanner;
