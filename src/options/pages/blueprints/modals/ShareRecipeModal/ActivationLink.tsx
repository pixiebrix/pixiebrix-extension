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

import { RegistryId } from "@/core";
import React from "react";
import { copyTextToClipboard } from "@/utils";
import notify from "@/utils/notify";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

type ActivationLinkProps = {
  blueprintId: RegistryId;
};

const ActivationLink: React.FunctionComponent<ActivationLinkProps> = ({
  blueprintId,
}) => {
  const installationLink = `https://app.pixiebrix.com/activate?id=${blueprintId}`;

  return (
    <div>
      <h4>Get activation link</h4>
      <Form.Group>
        <Form.Label className="pb-2">
          People with access can activate the blueprint with this link
        </Form.Label>
        <InputGroup>
          <Form.Control type="text" readOnly defaultValue={installationLink} />
          <InputGroup.Append>
            <Button
              variant="info"
              onClick={async () => {
                await copyTextToClipboard(installationLink);
                // Don't close the modal - that allows the user to re-copy the link and verify the link works
                notify.success("Copied activation link to clipboard");
              }}
            >
              <FontAwesomeIcon icon={faCopy} />
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </Form.Group>
    </div>
  );
};

export default ActivationLink;
