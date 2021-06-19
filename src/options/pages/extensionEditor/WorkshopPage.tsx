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

import React, { useContext, useMemo, useState } from "react";
import { PageTitle } from "@/layout/Page";
import {
  faCube,
  faHammer,
  faInfoCircle,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { Row, Col, Card, Form, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import registry from "@/extensionPoints/registry";
import { Link } from "react-router-dom";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { useFetch } from "@/hooks/fetch";
import AuthContext from "@/auth/AuthContext";
import { sortBy, uniq, compact } from "lodash";
import BlockModal from "@/components/fields/BlockModal";
import { useAsyncState } from "@/hooks/common";
import Select from "react-select";
import { PACKAGE_NAME_REGEX } from "@/registry/localRegistry";
import Fuse from "fuse.js";

import "./WorkshopPage.scss";
import { useTitle } from "@/hooks/title";

interface OwnProps {
  navigate: (url: string) => void;
}

interface Brick {
  id: string;
  name: string;
  verbose_name: string;
  version: string;
  kind: string;
}

interface EnhancedBrick extends Brick {
  scope: string;
  collection: string;
}

const CustomBricksSection: React.FunctionComponent<OwnProps> = ({
  navigate,
}) => {
  const [query, setQuery] = useState("");
  const [scopes, setScopes] = useState([]);
  const [collections, setCollections] = useState([]);
  const [kinds, setKinds] = useState([]);

  const remoteBricks = useFetch<Brick[]>("/api/bricks/");

  const enhancedBricks: EnhancedBrick[] = useMemo(() => {
    return sortBy(
      (remoteBricks ?? []).map((brick) => {
        const match = PACKAGE_NAME_REGEX.exec(brick.name);
        return {
          ...brick,
          scope: match.groups.scope,
          collection: match.groups.collection,
        };
      }),
      (x) => x.name
    );
  }, [remoteBricks]);

  const scopeOptions = useMemo(() => {
    return sortBy(
      uniq((enhancedBricks ?? []).map((x) => x.scope))
    ).map((value) => ({ value, label: value ?? "[No Scope]" }));
  }, [enhancedBricks]);

  const collectionOptions = useMemo(() => {
    return sortBy(
      uniq((enhancedBricks ?? []).map((x) => x.collection))
    ).map((value) => ({ value, label: value ?? "[No Collection]" }));
  }, [enhancedBricks]);

  const kindOptions = useMemo(() => {
    return sortBy(
      compact(uniq((enhancedBricks ?? []).map((x) => x.kind)))
    ).map((value) => ({ value, label: value }));
  }, [enhancedBricks]);

  const fuse: Fuse<EnhancedBrick> = useMemo(() => {
    return new Fuse(enhancedBricks, {
      keys: ["verbose_name", "name"],
    });
  }, [enhancedBricks]);

  const sortedBricks = useMemo(() => {
    const results =
      query.trim() !== ""
        ? fuse.search(query).map((x) => x.item)
        : enhancedBricks;
    return results.filter(
      (x) =>
        (scopes.length === 0 || scopes.includes(x.scope)) &&
        (collections.length === 0 || collections.includes(x.collection)) &&
        (kinds.length === 0 || kinds.includes(x.kind))
    );
  }, [fuse, query, scopes, collections, kinds, enhancedBricks]);

  return (
    <>
      <Row className="mt-4">
        <Col md="12" lg="8">
          <Form>
            <InputGroup className="mb-2 mr-sm-2">
              <InputGroup.Prepend>
                <InputGroup.Text>Search</InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                id="query"
                placeholder="Start typing to find results"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
          </Form>
        </Col>
      </Row>
      <Row>
        <Col>
          <div className="d-flex">
            <div style={{ width: 200 }}>
              <Select
                isMulti
                placeholder="Filter @scope"
                options={scopeOptions}
                value={scopeOptions.filter((x) => scopes.includes(x.value))}
                onChange={(values) => {
                  const selected: any = values;
                  setScopes((selected ?? []).map((x: any) => x.value));
                }}
              />
            </div>
            <div style={{ width: 200 }} className="ml-3">
              <Select
                isMulti
                placeholder="Filter collection"
                options={collectionOptions}
                value={collectionOptions.filter((x) =>
                  collections.includes(x.value)
                )}
                onChange={(values) => {
                  const selected: any = values;
                  setCollections((selected ?? []).map((x: any) => x.value));
                }}
              />
            </div>
            <div style={{ width: 200 }} className="ml-3">
              <Select
                isMulti
                placeholder="Filter kind"
                options={kindOptions}
                value={kindOptions.filter((x) => kinds.includes(x.value))}
                onChange={(values) => {
                  const selected: any = values;
                  setKinds((selected ?? []).map((x: any) => x.value));
                }}
              />
            </div>
          </div>
        </Col>
      </Row>
      <Row>
        <Col className="mt-4" md="12" lg="8">
          <CustomBricksCard navigate={navigate} bricks={sortedBricks} />
        </Col>
      </Row>
    </>
  );
};

const CustomBricksCard: React.FunctionComponent<
  OwnProps & { bricks: EnhancedBrick[]; maxRows?: number }
> = ({ navigate, bricks, maxRows = 10 }) => {
  return (
    <Card>
      <Card.Header>Custom Bricks</Card.Header>
      <Table className="WorkshopPage__BrickTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Collection</th>
            <th>Type</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          {bricks.slice(0, maxRows).map((x) => (
            <tr key={x.id} onClick={() => navigate(`/workshop/bricks/${x.id}`)}>
              <td>
                <div>{x.verbose_name}</div>
                <div className="mt-1">
                  <code className="p-0" style={{ fontSize: "0.8rem" }}>
                    {x.name}
                  </code>
                </div>
              </td>
              <td>{x.collection}</td>
              <td>{x.kind}</td>
              <td>{x.version}</td>
            </tr>
          ))}
          {bricks.length >= maxRows && (
            <tr className="WorkshopPage__BrickTable__more">
              <td colSpan={4} className="text-info text-center">
                <FontAwesomeIcon icon={faInfoCircle} />{" "}
                {bricks.length - maxRows} more entries not shown
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
};

const WorkshopPage: React.FunctionComponent<OwnProps> = ({ navigate }) => {
  useTitle("Workshop");
  const { isLoggedIn, flags } = useContext(AuthContext);

  const [extensionPoints] = useAsyncState(registry.all(), []);

  return (
    <div>
      <PageTitle icon={faHammer} title="Workshop" />
      <div className="pb-4">
        <p>
          Build and attach bricks.{" "}
          {flags.includes("marketplace") && (
            <>
              To activate pre-made blueprints, visit the{" "}
              <Link to={"/marketplace"}>Marketplace</Link>
            </>
          )}
        </p>
      </div>
      <Row>
        <Col md="12" lg="8">
          <BlockModal
            blocks={extensionPoints}
            caption="Select foundation"
            renderButton={({ show }) => (
              <Button variant="info" onClick={show}>
                <FontAwesomeIcon icon={faCube} /> Use Foundation
              </Button>
            )}
            onSelect={(block) => {
              navigate(`/workshop/install/${encodeURIComponent(block.id)}`);
            }}
          />

          {isLoggedIn && (
            <Button
              className="ml-3"
              variant="info"
              onClick={() => navigate(`/workshop/create/`)}
            >
              <FontAwesomeIcon icon={faPlus} /> Create New Brick
            </Button>
          )}
        </Col>
      </Row>

      {isLoggedIn && <CustomBricksSection navigate={navigate} />}
    </div>
  );
};

export default WorkshopPage;
