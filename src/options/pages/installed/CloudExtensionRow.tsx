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

import React, { useState } from "react";
import { ResolvedExtension } from "@/core";
import AsyncButton from "@/components/AsyncButton";
import useNotifications from "@/hooks/useNotifications";
import { faCloudDownloadAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useUserAction from "@/hooks/useUserAction";
import { getLinkedApiClient } from "@/services/apiClient";

/**
 * Extension row corresponding to a cloud-synced extension that's not active on the user's current client.
 */
const CloudExtensionRow: React.FunctionComponent<{
  extension: ResolvedExtension;
}> = ({ extension }) => {
  const [deleted, setDeleted] = useState(false);
  const { id, label } = extension;
  const notify = useNotifications();

  const onDelete = useUserAction(
    async () => {
      // FIXME: if this is the last extension in the table, `NoExtensionsPage` won't be displayed after its deleted
      const client = await getLinkedApiClient();
      await client.delete(`/api/extensions/${id}/`);
      setDeleted(true);
    },
    {
      successMessage: `Deleted brick ${label ?? id} from server`,
      errorMessage: `Error deleting brick ${label ?? id} from the server`,
      event: "ExtensionCloudDelete",
    },
    [id]
  );

  if (deleted) {
    return null;
  }

  return (
    <tr>
      <td>&nbsp;</td>
      <td>{label ?? id}</td>
      <td className="text-wrap">
        <AsyncButton
          variant="info"
          size="sm"
          onClick={() => {
            notify.success(`Activated brick ${label ?? id}`, {
              event: "ExtensionCloudActivate",
            });
          }}
        >
          <FontAwesomeIcon icon={faCloudDownloadAlt} /> Activate
        </AsyncButton>
      </td>
      <td>
        <AsyncButton variant="danger" size="sm" onClick={onDelete}>
          Delete
        </AsyncButton>
      </td>
    </tr>
  );
};

export default CloudExtensionRow;
