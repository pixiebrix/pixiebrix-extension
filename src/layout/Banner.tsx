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

import React, { useContext, useState } from "react";
import cx from "classnames";
import "./Banner.scss";
import { getExtensionAuth } from "@/auth/token";
import useAsyncEffect from "use-async-effect";
import AuthContext from "@/auth/AuthContext";
import { isExtensionContext } from "@/chrome";
import { connectPage } from "@/messaging/external";

const environment = process.env.ENVIRONMENT;

const classMap = new Map([
  [null, "development"],
  ["", "development"],
  ["development", "development"],
  ["staging", "staging"],
]);

function useSyncedHostname() {
  const { extension } = useContext(AuthContext);
  const [hostname, setHostname] = useState<string>();

  useAsyncEffect(async () => {
    if (extension) {
      const { hostname } = await getExtensionAuth();
      setHostname(hostname);
    }
  }, [extension]);

  return hostname;
}

function useVersionName() {
  const [versionName, setVersionName] = useState<string>();

  useAsyncEffect(async () => {
    const manifest = isExtensionContext()
      ? chrome.runtime.getManifest()
      : await connectPage();
    setVersionName(manifest.version_name);
  }, []);

  return versionName;
}

const Banner: React.FunctionComponent = () => {
  const { extension } = useContext(AuthContext);
  const hostname = useSyncedHostname();
  const versionName = useVersionName();

  if (environment === "production") {
    return null;
  }

  const syncText = hostname
    ? `synced with ${hostname}`
    : `not synced with server`;

  return (
    <div
      className={cx("environment-banner", "w-100", {
        [classMap.get(environment) ?? "unknown"]: true,
      })}
    >
      You are using {extension ? "extension" : "server"}{" "}
      {environment ?? "unknown"} build {versionName} {extension && syncText}
    </div>
  );
};

export default Banner;
