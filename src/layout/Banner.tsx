/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import React, { useContext, useState } from "react";
import cx from "classnames";
import "./Banner.scss";
import { getExtensionAuth } from "@/auth/token";
import useAsyncEffect from "use-async-effect";
import AuthContext from "@/auth/AuthContext";

const environment = process.env.ENVIRONMENT;
const version = process.env.NPM_PACKAGE_VERSION;
const source_version = process.env.SOURCE_VERSION;

const classMap: { [key: string]: string } = {
  "": "development",
  development: "development",
  staging: "staging",
};

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

const Banner: React.FunctionComponent = () => {
  const { extension } = useContext(AuthContext);
  const hostname = useSyncedHostname();

  if (environment === "production") {
    return null;
  }

  const syncText = hostname
    ? `synced with ${hostname}`
    : `not synced with server`;

  return (
    <div
      className={cx("environment-banner", "w-100", {
        [classMap[environment] ?? "unknown"]: true,
      })}
    >
      You are using {extension ? "extension" : "server"}{" "}
      {environment ?? "unknown"} build {version} (
      {source_version.substring(0, 8).trim()}) {extension && syncText}
    </div>
  );
};

export default Banner;
