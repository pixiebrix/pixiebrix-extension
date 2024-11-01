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

import React, { useEffect, useRef } from "react";
import Banner from "@/components/banner/Banner";
import useAsyncState from "@/hooks/useAsyncState";
import { count as pingPackageDatabase } from "@/registry/packageRegistry";
import useTimeoutState from "@/hooks/useTimeoutState";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import reportError from "@/telemetry/reportError";

const errorBanner = (
  <Banner variant="warning">
    <span>
      {
        "We're having trouble connecting to your browser's local database, please restart your browser."
      }
    </span>{" "}
    <a href="https://docs.pixiebrix.com/how-to/troubleshooting">Read More</a>
  </Banner>
);

/**
 * Banner that displays when the local registry IDB database is unresponsive.
 * @param timeoutMillis the number of milliseconds to wait before IDB is considered unresponsive
 */
const DatabaseUnresponsiveBanner: React.VoidFunctionComponent<{
  timeoutMillis?: number;
}> = ({ timeoutMillis = 3500 }) => {
  const state = useAsyncState(async () => pingPackageDatabase(), []);

  const hasWaited = useTimeoutState(timeoutMillis);

  const showBannerRef = useRef(false);
  const showBanner = !state.isSuccess && hasWaited;

  useEffect(() => {
    if (showBanner && !showBannerRef.current) {
      reportEvent(Events.IDB_UNRESPONSIVE_BANNER);
      reportError(new Error("IDB unresponsive"));

      showBannerRef.current = true;
    }
  }, [showBanner]);

  return showBanner ? errorBanner : null;
};

export default DatabaseUnresponsiveBanner;
