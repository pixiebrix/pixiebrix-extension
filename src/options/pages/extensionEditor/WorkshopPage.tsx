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

import React, { useContext, useMemo, useState } from "react";
import { PageTitle } from "@/layout/Page";
import {
  faBars,
  faBolt,
  faBookOpen,
  faCloud,
  faColumns,
  faCube,
  faHammer,
  faInfoCircle,
  faMousePointer,
  faPlus,
  faStoreAlt,
  faTimes,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import {
  Row,
  Col,
  Card,
  Form,
  InputGroup,
  Table,
  Button,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import registry from "@/extensionPoints/registry";
import { Link } from "react-router-dom";
import { useFetch } from "@/hooks/fetch";
import AuthContext from "@/auth/AuthContext";
import { orderBy, uniq, compact, sortBy, isEmpty } from "lodash";
import BlockModal from "@/components/fields/BlockModal";
import { useAsyncState } from "@/hooks/common";
import Select from "react-select";
import { PACKAGE_NAME_REGEX } from "@/registry/localRegistry";
import { WorkshopState, workshopSlice } from "@/options/slices";
import { useDispatch, useSelector } from "react-redux";

const { actions } = workshopSlice;

import Fuse from "fuse.js";

import "./WorkshopPage.scss";
import { useTitle } from "@/hooks/title";
import { Brick } from "@/types/contract";

interface OwnProps {
  navigate: (url: string) => void;
}

interface EnhancedBrick extends Brick {
  scope: string;
  collection: string;
  timestamp: number | null;
}

function selectRecent(state: { workshop: WorkshopState }) {
  return new Map((state.workshop.recent ?? []).map((x) => [x.id, x.timestamp]));
}

function selectFilters(state: { workshop: WorkshopState }) {
  return state.workshop.filters;
}

function useEnrichBricks(bricks: Brick[]): EnhancedBrick[] {
  const recent = useSelector(selectRecent);

  return useMemo(() => {
    console.debug("Recent bricks", { recent });

    return orderBy(
      (bricks ?? []).map((brick) => {
        const match = PACKAGE_NAME_REGEX.exec(brick.name);
        return {
          ...brick,
          scope: match.groups.scope,
          collection: match.groups.collection,
          timestamp: recent.get(brick.id),
        };
      }),
      // Show recently accessed first
      [(x) => x.timestamp ?? -1, (x) => x.verbose_name],
      ["desc", "asc"]
    );
  }, [recent, bricks]);
}

function useSearchOptions(bricks: EnhancedBrick[]) {
  const scopeOptions = useMemo(() => {
    return sortBy(uniq((bricks ?? []).map((x) => x.scope))).map((value) => ({
      value,
      label: value ?? "[No Scope]",
    }));
  }, [bricks]);

  const collectionOptions = useMemo(() => {
    return sortBy(
      uniq((bricks ?? []).map((x) => x.collection))
    ).map((value) => ({ value, label: value ?? "[No Collection]" }));
  }, [bricks]);

  const kindOptions = useMemo(() => {
    return sortBy(
      compact(uniq((bricks ?? []).map((x) => x.kind)))
    ).map((value) => ({ value, label: value }));
  }, [bricks]);

  return {
    scopeOptions,
    collectionOptions,
    kindOptions,
  };
}

const CustomBricksSection: React.FunctionComponent<OwnProps> = ({
  navigate,
}) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const remoteBricks = useFetch<Brick[]>("/api/bricks/");
  const { scopes = [], collections = [], kinds = [] } = useSelector(
    selectFilters
  );
  const bricks = useEnrichBricks(remoteBricks);
  const { scopeOptions, kindOptions, collectionOptions } = useSearchOptions(
    bricks
  );

  const filtered = !isEmpty(scopes) || !isEmpty(collections) || !isEmpty(kinds);

  const fuse: Fuse<EnhancedBrick> = useMemo(() => {
    return new Fuse(bricks, {
      keys: ["verbose_name", "name"],
    });
  }, [bricks]);

  const sortedBricks = useMemo(() => {
    const results =
      query.trim() !== "" ? fuse.search(query).map((x) => x.item) : bricks;
    return results.filter(
      (x) =>
        (scopes.length === 0 || scopes.includes(x.scope)) &&
        (collections.length === 0 || collections.includes(x.collection)) &&
        (kinds.length === 0 || kinds.includes(x.kind))
    );
  }, [fuse, query, scopes, collections, kinds, bricks]);

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
                  dispatch(
                    actions.setScopes((values ?? []).map((x) => x.value))
                  );
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
                  dispatch(
                    actions.setCollections((values ?? []).map((x) => x.value))
                  );
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
                  dispatch(
                    actions.setKinds((values ?? []).map((x) => x.value))
                  );
                }}
              />
            </div>
            <div className="ml-3">
              {filtered && (
                <Button
                  variant="info"
                  size="sm"
                  style={{ height: "36px", marginTop: "1px" }}
                  onClick={() => {
                    dispatch(actions.clearFilters());
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} /> Reset Filters
                </Button>
              )}
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

const KindIcon: React.FunctionComponent<{ brick: EnhancedBrick }> = ({
  brick: { kind, verbose_name },
}) => {
  // HACK: inferring from the brick naming convention instead of the type since the API doesn't return it yet
  let icon = faCube;
  if (kind === "Service") {
    icon = faCloud;
  } else if (kind === "Foundation") {
    const normalized = verbose_name.toLowerCase();
    if (normalized.includes("trigger")) {
      icon = faBolt;
    } else if (normalized.includes("panel")) {
      icon = faWindowMaximize;
    } else if (normalized.includes("button")) {
      icon = faMousePointer;
    } else if (normalized.includes("context")) {
      icon = faBars;
    } else if (normalized.includes("menu")) {
      icon = faMousePointer;
    } else if (normalized.includes("sidebar")) {
      icon = faColumns;
    }
  } else if (kind === "Reader") {
    icon = faBookOpen;
  } else if (kind === "Blueprint") {
    icon = faStoreAlt;
  }
  return <FontAwesomeIcon icon={icon} fixedWidth />;
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
            <th>&nbsp;</th>
            <th>Name</th>
            <th>Collection</th>
            <th>Type</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          {bricks.slice(0, maxRows).map((brick) => (
            <tr
              key={brick.id}
              onClick={() => navigate(`/workshop/bricks/${brick.id}`)}
            >
              <td className="text-right text-muted px-1">
                <KindIcon brick={brick} />
              </td>
              <td>
                <div>{brick.verbose_name}</div>
                <div className="mt-1">
                  <code className="p-0" style={{ fontSize: "0.8rem" }}>
                    {brick.name}
                  </code>
                </div>
              </td>
              <td>{brick.collection}</td>
              <td>{brick.kind}</td>
              <td>{brick.version}</td>
            </tr>
          ))}
          {bricks.length >= maxRows && (
            <tr className="WorkshopPage__BrickTable__more">
              <td colSpan={5} className="text-info text-center">
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
