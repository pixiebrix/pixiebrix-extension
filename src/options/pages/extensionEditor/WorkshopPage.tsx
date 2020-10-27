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

import React, { useContext } from "react";
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import AsyncSelect from "react-select/async";
import {
  ExtensionPointOption,
  getExtensionPointOptions,
} from "@/extensionPoints/registry";
import { Link } from "react-router-dom";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { useFetch } from "@/hooks/fetch";
import { AuthContext } from "@/auth/context";

interface OwnProps {
  navigate: (url: string) => void;
}

interface Brick {
  id: string;
  name: string;
  version: string;
  kind: string;
}

const CustomBricksCard: React.FunctionComponent<OwnProps> = ({ navigate }) => {
  const remoteBricks = useFetch<Brick[]>("/api/bricks/");

  return (
    <Card>
      <Card.Header>Advanced: Custom Bricks</Card.Header>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Version</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(remoteBricks ?? []).map((x) => (
            <tr key={x.id}>
              <td>{x.name}</td>
              <td>{x.kind}</td>
              <td>{x.version}</td>
              <td>
                <Button
                  size="sm"
                  onClick={() => navigate(`/workshop/bricks/${x.id}`)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Card.Footer>
        <Button size="sm" onClick={() => navigate(`/workshop/create/`)}>
          Create New Brick
        </Button>
      </Card.Footer>
    </Card>
  );
};

const WorkshopPage: React.FunctionComponent<OwnProps> = ({ navigate }) => {
  const { isLoggedIn } = useContext(AuthContext);

  return (
    <div>
      <PageTitle icon={faHammer} title="Workshop" />
      <div className="pb-4">
        <p>
          Build and install bricks. To install pre-made blueprints, visit the{" "}
          <Link to={"/marketplace"}>Marketplace</Link>
        </p>
      </div>
      <Row>
        <Col md="12" lg="8">
          <div className="d-flex align-items-center">
            <div className="mr-2">Install a brick:</div>
            <div style={{ width: 250 }}>
              <AsyncSelect
                defaultOptions
                placeholder="Select a foundation"
                loadOptions={getExtensionPointOptions}
                onChange={(option: ExtensionPointOption) =>
                  navigate(
                    `/workshop/install/${encodeURIComponent(option.value)}`
                  )
                }
              />
            </div>
          </div>
        </Col>
      </Row>

      {isLoggedIn && (
        <Row>
          <Col className="mt-4" md="12" lg="8">
            <CustomBricksCard navigate={navigate} />
          </Col>
        </Row>
      )}
    </div>
  );
};

export default WorkshopPage;
