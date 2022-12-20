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

import React from "react";
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useRecipe } from "@/recipes/recipesHooks";
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import ActivationLink from "./ActivationLink";
import PublishContentLayout from "./PublishContentLayout";

const PublishedContent: React.FunctionComponent = (props) => {
  const { blueprintId } = useSelector(selectShowPublishContext);
  const { data: recipe } = useRecipe(blueprintId);

  return (
    <PublishContentLayout title="Published">
      <Modal.Body>
        <h3>{recipe?.metadata.name}</h3>

        <p>The blueprint has been published to the Marketplace.</p>
        <p className="mb-1">Public link to share:</p>
        <ActivationLink blueprintId={blueprintId} />
      </Modal.Body>
    </PublishContentLayout>
  );
};

export default PublishedContent;
