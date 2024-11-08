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

import React from "react";
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import { selectShowPublishContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import ActivationLink from "@/activation/ActivationLink";
import PublishContentLayout from "./PublishContentLayout";
import { assertNotNullish } from "@/utils/nullishUtils";

const PublishedContent: React.FunctionComponent = () => {
  const publishContext = useSelector(selectShowPublishContext);
  const modId = publishContext?.modId;
  assertNotNullish(modId, "modId not found in PublishContext");

  return (
    <PublishContentLayout title="Published">
      <Modal.Body>
        <p>The mod has been published to the Marketplace.</p>
        <p className="mb-1">Public link to share:</p>
        <ActivationLink modId={modId} />
      </Modal.Body>
    </PublishContentLayout>
  );
};

export default PublishedContent;
