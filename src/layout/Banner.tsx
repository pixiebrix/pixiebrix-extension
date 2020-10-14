import React, { useContext, useState } from "react";
import cx from "classnames";
import "./Banner.scss";
import { getExtensionAuth } from "@/auth/token";
import useAsyncEffect from "use-async-effect";
import AuthContext from "@/auth/context";

const environment = process.env.NODE_ENV;
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
      {source_version.substring(0, 8)}) {extension && syncText}
    </div>
  );
};

export default Banner;
