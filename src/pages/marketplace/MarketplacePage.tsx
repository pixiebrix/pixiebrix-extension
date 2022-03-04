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

import styles from "./MarketplacePage.module.scss";

import React, { useMemo, useState } from "react";
import Loader from "@/components/Loader";
import { PageTitle } from "@/layout/Page";
import {
  faExternalLinkAlt,
  faEyeSlash,
  faScroll,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { Metadata, Sharing, UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { Col, InputGroup, ListGroup, Row, Button, Form } from "react-bootstrap";
import type { ButtonProps } from "react-bootstrap";
import useFetch from "@/hooks/useFetch";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useGetAuthQuery, useGetOrganizationsQuery } from "@/services/api";
import { sortBy } from "lodash";
import Pagination from "@/components/pagination/Pagination";
import { Organization } from "@/types/contract";
import useFlags from "@/auth/useFlags";

export type InstallRecipe = (recipe: RecipeDefinition) => Promise<void>;

export interface MarketplaceProps {
  installedRecipes: Set<string>;
  installRecipe: InstallRecipe;
  recipesPerPage?: number;
}

interface RecipeProps {
  metadata: Metadata;
  sharing?: Sharing;
  organizations?: Organization[];
  installed: boolean;
  onInstall?: () => void;
}

const Entry: React.FunctionComponent<
  RecipeProps & { buttonProps?: ButtonProps }
> = ({
  metadata: { id, name, description },
  sharing,
  organizations,
  buttonProps = {},
  onInstall,
  installed,
}) => {
  const organization = useMemo(() => {
    if (sharing.organizations.length === 0) {
      return null;
    }

    // If more than one sharing organization, use the first
    return organizations.find((org) =>
      sharing.organizations.includes(org.id as UUID)
    );
  }, [organizations, sharing.organizations]);

  const installButton = useMemo(() => {
    if (!onInstall) {
      return null;
    }

    if (!installed) {
      return (
        <Button
          size="sm"
          variant="info"
          className={styles.activateButton}
          {...buttonProps}
          onClick={onInstall}
        >
          Activate
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="info"
        className={styles.activateButton}
        {...buttonProps}
        disabled
      >
        Activated
      </Button>
    );
  }, [onInstall, installed, buttonProps]);

  return (
    <ListGroup.Item>
      <div className="d-flex align-middle">
        <div className="my-auto mr-3">{installButton}</div>
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="mb-0">{name}</h5>
            </div>
            <div className="small mb-1 pt-0">
              <code className="pl-0 ml-0">{id}</code>
            </div>
          </div>

          <div className="d-flex justify-content-between">
            <div>
              <p className="mb-1 mt-1">{description}</p>
            </div>
            <div className="small d-flex align-items-end">
              <p className="mb-1 mt-1 pl-5 text-nowrap">
                {organization ? (
                  <>
                    <FontAwesomeIcon icon={faUsers} /> {organization.name}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faEyeSlash} /> Personal
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
};

export const RecipeList: React.FunctionComponent<
  MarketplaceProps & {
    buttonProps?: ButtonProps;
    recipes: RecipeDefinition[];
    organizations: Organization[];
  }
> = ({
  buttonProps,
  recipes,
  organizations,
  installedRecipes,
  installRecipe,
}) => (
  <ListGroup>
    {(recipes ?? []).slice(0, 10).map((x) => (
      <Entry
        {...x}
        buttonProps={buttonProps}
        organizations={organizations}
        key={x.metadata.id}
        onInstall={async () => installRecipe(x)}
        installed={installedRecipes.has(x.metadata.id)}
      />
    ))}
  </ListGroup>
);

const MarketplacePage: React.FunctionComponent<MarketplaceProps> = ({
  installRecipe,
  installedRecipes,
  recipesPerPage = 10,
}) => {
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const { data: rawRecipes } = useFetch<RecipeDefinition[]>("/api/recipes/");
  const [query, setQuery] = useState("");
  const {
    data: { scope },
  } = useGetAuthQuery();

  const { permit } = useFlags();

  const [page, setPage] = useState(0);

  const recipes = useMemo(() => {
    const personalOrTeamRecipes = (rawRecipes ?? []).filter(
      (recipe) =>
        recipe.sharing.organizations.length > 0 ||
        recipe.metadata.id.includes(scope)
    );
    const normalQuery = (query ?? "").toLowerCase();
    const filtered = personalOrTeamRecipes.filter(
      (x) =>
        query.trim() === "" ||
        x.metadata.name.toLowerCase().includes(normalQuery) ||
        x.metadata.description?.toLowerCase().includes(normalQuery)
    );
    return sortBy(filtered, (x) => x.metadata.name);
  }, [rawRecipes, query, scope]);

  const numPages = useMemo(
    () => Math.ceil(recipes.length / recipesPerPage),
    [recipes, recipesPerPage]
  );
  const pageRecipes = useMemo(
    () => recipes.slice(page * recipesPerPage, (page + 1) * recipesPerPage),
    [recipes, recipesPerPage, page]
  );

  return (
    <div className="marketplace-component">
      <Row>
        <Col>
          <PageTitle icon={faScroll} title="My Blueprints" />
          <div className="pb-4">
            <p>
              Activate pre-made blueprints for your favorite websites and SaaS
              apps
            </p>
          </div>
        </Col>

        {permit("marketplace") && (
          <Col className="text-right">
            <a
              href="https://www.pixiebrix.com/marketplace"
              className="btn btn-info"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
              Open Public Marketplace
            </a>
          </Col>
        )}
      </Row>

      <Row>
        <Col xl={8} lg={10} md={12}>
          <Form>
            <InputGroup className="mb-2 mr-sm-2">
              <InputGroup.Prepend>
                <InputGroup.Text className={styles.searchLabel}>
                  Search
                </InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                id="query"
                placeholder="Start typing to filter blueprints"
                value={query}
                onChange={({ target }) => {
                  setQuery(target.value);
                }}
              />
            </InputGroup>
          </Form>
        </Col>
      </Row>

      <Row>
        <Col xl={8} lg={10} md={12}>
          {rawRecipes == null ? (
            <Loader />
          ) : (
            <RecipeList
              installedRecipes={installedRecipes}
              installRecipe={installRecipe}
              recipes={pageRecipes}
              organizations={organizations}
            />
          )}
        </Col>
      </Row>

      {rawRecipes != null && recipes.length > 0 && (
        <Row>
          <Col
            xl={8}
            lg={10}
            md={12}
            className="d-flex justify-content-between py-2"
          >
            <p className="text-muted py-2">
              Showing {page * recipesPerPage + 1} to{" "}
              {recipesPerPage * page + pageRecipes.length} of {recipes.length}{" "}
              blueprints
            </p>
            {recipes.length > recipesPerPage && (
              <Pagination page={page} setPage={setPage} numPages={numPages} />
            )}
          </Col>
        </Row>
      )}

      {rawRecipes != null && recipes.length === 0 && (
        <Row>
          <Col xl={8} lg={10} md={12} className="my-3 text-muted">
            <p>
              No personal or team blueprints{" "}
              {query && (
                <>
                  matching the search key <b>&quot;{query}&quot;</b>
                </>
              )}{" "}
              available.
            </p>

            <p>
              Suggestions:
              <ul>
                <li>
                  Browse public blueprints in the{" "}
                  <a
                    href="https://www.pixiebrix.com/marketplace"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Marketplace
                  </a>
                </li>
                <li>
                  Create blueprints in the <a href={"#/workshop"}>Workshop</a>
                </li>
              </ul>
            </p>
          </Col>
        </Row>
      )}
    </div>
  );
};

MarketplacePage.defaultProps = {
  installedRecipes: new Set(),
};

export default MarketplacePage;
