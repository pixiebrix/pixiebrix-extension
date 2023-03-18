/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type ProxiedResponse } from "@/errors/businessErrors";
import styles from "@/components/errors/ErrorDetail.module.scss";
import { safeGuessStatusText } from "@/errors/networkErrorHelpers";
import JsonTree from "@/components/jsonTree/JsonTree";

/**
 * Component for showing error details for a remote API proxied via PixieBrix.
 * @param response the proxied response from the remote API
 * @see ProxiedRemoteServiceError
 */
const RemoteApiErrorDetail: React.FunctionComponent<{
  response: ProxiedResponse;
}> = ({ response }) => {
  const { status } = response;

  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <h5>Response from Remote API</h5>

        {status && (
          <div>
            Status: {status} &mdash; {safeGuessStatusText(status)}
          </div>
        )}
        <JsonTree data={response} />
      </div>
    </div>
  );
};

export default RemoteApiErrorDetail;
