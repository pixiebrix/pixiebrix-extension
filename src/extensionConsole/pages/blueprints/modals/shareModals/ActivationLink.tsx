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

import { type RegistryId } from "@/types/registryTypes";
import React from "react";
import notify from "@/utils/notify";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";

type ActivationLinkProps = {
  blueprintId: RegistryId;
};

const ActivationLink: React.FunctionComponent<ActivationLinkProps> = ({
  blueprintId,
}) => {
  const installationLink = `https://app.pixiebrix.com/activate?id=${blueprintId}`;

  return (
    <InputGroup>
      <Form.Control type="text" readOnly defaultValue={installationLink} />
      <InputGroup.Append>
        <AsyncButton
          variant="info"
          onClick={async () => {
            await navigator.clipboard.writeText(installationLink);
            // Don't close the modal - that allows the user to re-copy the link and verify the link works
            notify.success("Copied activation link to clipboard");
          }}
        >
          <FontAwesomeIcon icon={faCopy} />
        </AsyncButton>
      </InputGroup.Append>
    </InputGroup>
  );
};

export default ActivationLink;
