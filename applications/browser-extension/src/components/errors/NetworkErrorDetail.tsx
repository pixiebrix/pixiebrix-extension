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

import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import JsonTree from "@/components/jsonTree/JsonTree";
import { selectAbsoluteUrl } from "@/utils/urlUtils";
import { safeGuessStatusText } from "@/errors/networkErrorHelpers";
import styles from "./ErrorDetail.module.scss";
import useAsyncState from "@/hooks/useAsyncState";
import AsyncStateGate from "@/components/AsyncStateGate";
import { type AxiosError } from "axios";

function tryParse(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      // If payload is JSON, parse it for easier reading
      return JSON.parse(value);
    } catch {
      // NOP
    }
  }

  return value;
}

const NetworkErrorDetail: React.FunctionComponent<{
  error: AxiosError;
}> = ({ error }) => {
  const absoluteUrl = selectAbsoluteUrl(error.config);

  const permissionsState = useAsyncState<boolean | undefined>(
    async () => browser.permissions.contains({ origins: [absoluteUrl] }),
    [absoluteUrl],
  );

  const cleanConfig = useMemo(() => {
    const { data, ...rest } = error.config ?? {};
    return {
      ...rest,
      data: tryParse(data),
    };
  }, [error.config]);

  const cleanResponse = useMemo(() => {
    if (error.response) {
      const { request, config, data, ...rest } = error.response;
      // Don't include request or config, because we're showing it the other column
      return {
        ...rest,
        data: tryParse(data),
      };
    }
  }, [error.response]);

  const status = error.response?.status;

  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <h5>Response</h5>
        <AsyncStateGate
          state={permissionsState}
          renderLoader={() => null}
          renderError={() => null}
        >
          {({ data: hasPermissions }) =>
            hasPermissions ? (
              <div className="text-info">
                <FontAwesomeIcon icon={faCheck} /> PixieBrix has permission to
                access {absoluteUrl}
              </div>
            ) : (
              <div className="text-warning">
                <FontAwesomeIcon icon={faExclamationTriangle} /> PixieBrix does
                not have permission to access {absoluteUrl}. Contact your IT
                Administrator for the
                <code>runtime_blocked_hosts</code> Chrome Browser Extension
                policy.
              </div>
            )
          }
        </AsyncStateGate>
        {status && (
          <div>
            Status: {status} &mdash; {safeGuessStatusText(status)}
          </div>
        )}
        {cleanResponse == null ? (
          <div>
            <div>
              PixieBrix did not receive a response. See{" "}
              <a
                href="https://docs.pixiebrix.com/how-to/troubleshooting/troubleshooting-network-errors"
                target="_blank"
                rel="noreferrer"
              >
                Troubleshooting Network Errors
              </a>
            </div>
          </div>
        ) : (
          <JsonTree data={cleanResponse} />
        )}
      </div>
      <div className={styles.column}>
        <h5>Request Config</h5>
        <JsonTree data={cleanConfig} />
      </div>
    </div>
  );
};

export default NetworkErrorDetail;
