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

import { Card } from "react-bootstrap";
import React, { useMemo } from "react";
import { IExtensionPoint } from "@/core";
import { isEmpty } from "lodash";
import "./DataSourceCard.scss";
import { useAsyncState } from "@/hooks/common";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import SchemaTree from "@/components/schemaTree/SchemaTree";

const DataSourceCard: React.FunctionComponent<{
  extensionPoint: IExtensionPoint;
}> = ({ extensionPoint }) => {
  const [outputSchema, isPending, error] = useAsyncState(async () => {
    const reader = await extensionPoint.defaultReader();
    return reader.outputSchema;
  }, [extensionPoint]);

  const body = useMemo(() => {
    if (isPending) {
      return <GridLoader />;
    }

    if (error) {
      return (
        <Card.Body className="text-danger">{getErrorMessage(error)}</Card.Body>
      );
    }

    if (isEmpty(outputSchema)) {
      return <Card.Body>No schema available</Card.Body>;
    }

    return <SchemaTree schema={outputSchema} />;
  }, [error, outputSchema, isPending]);

  return <div className="DataSourceCard">{body}</div>;
};

export default DataSourceCard;
