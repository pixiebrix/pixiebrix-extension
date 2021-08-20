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

import React from "react";

import { useField } from "formik";
import { UserOptions } from "@/core";
import { Card, Table } from "react-bootstrap";

const OptionsArgsCard: React.FunctionComponent<{
  name: string;
}> = (props) => {
  const [field] = useField<UserOptions>(props);

  return (
    <div className="OptionsArgsCard">
      <Card.Body className="pb-2">
        <p>
          Options selected during activation. You can refer to these in the
          configuration as <code>@options.name</code>
        </p>
      </Card.Body>
      <Table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(field.value).map(([optionProp, value]) => (
            <tr key={optionProp}>
              <td>{optionProp}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default OptionsArgsCard;
