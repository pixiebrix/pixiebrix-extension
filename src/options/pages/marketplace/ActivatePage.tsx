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

import { PageTitle } from "@/layout/Page";
import {
  faClipboardCheck,
  faStoreAlt,
} from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { useParams } from "react-router";
import { useFetch } from "@/hooks/fetch";
import { RecipeDefinition } from "@/types/definitions";
import { Col, Row } from "react-bootstrap";
import { GridLoader } from "react-spinners";
import ActivateWizard from "@/options/pages/marketplace/ActivateWizard";

interface BlueprintResponse {
  config: RecipeDefinition;
}

const ActivatePage: React.FunctionComponent = () => {
  const { blueprintId, sourcePage } = useParams<{
    blueprintId: string;
    sourcePage: string;
  }>();
  const blueprint = useFetch<BlueprintResponse>(`/api/recipes/${blueprintId}`);

  return (
    <div>
      <PageTitle
        icon={sourcePage === "templates" ? faClipboardCheck : faStoreAlt}
        title={
          blueprint
            ? `Activate: ${blueprint.config.metadata.name}`
            : "Activate Blueprint"
        }
      />
      <div className="pb-4">
        {sourcePage === "templates" ? (
          <p>Configure and activate a blueprint from the marketplace</p>
        ) : (
          <p>Configure and activate a pre-made template</p>
        )}
      </div>

      <Row>
        <Col xl={8} lg={10} md={12}>
          {blueprint ? (
            <ActivateWizard blueprint={blueprint.config} />
          ) : (
            <GridLoader />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ActivatePage;
