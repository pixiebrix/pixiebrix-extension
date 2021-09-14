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
import GridLoader from "react-spinners/GridLoader";
import { PageTitle } from "@/layout/Page";
import { sortBy } from "lodash";
import {
  faExternalLinkAlt,
  faEyeSlash,
  faScroll,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { Metadata } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { Col, InputGroup, ListGroup, Row, Button, Form } from "react-bootstrap";
import "./MarketplacePage.scss";
import type { ButtonProps } from "react-bootstrap";
import useFetch from "@/hooks/useFetch";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AuthContext from "@/auth/AuthContext";

export type InstallRecipe = (recipe: RecipeDefinition) => Promise<void>;

export interface MarketplaceProps {
  installedRecipes: Set<string>;
  installRecipe: InstallRecipe;
}

interface RecipeProps {
  metadata: Metadata;
  installed: boolean;
  onInstall?: () => void;
}

const Entry: React.FunctionComponent<
  RecipeProps & { buttonProps?: ButtonProps }
> = ({
  metadata: { id, name, description, author, organization },
  buttonProps = {},
  onInstall,
  installed,
}) => {
  const installButton = useMemo(() => {
    if (!onInstall) {
      return null;
    }

    if (!installed) {
      return (
        <Button size="sm" variant="info" {...buttonProps} onClick={onInstall}>
          Activate
        </Button>
      );
    }

    return (
      <Button size="sm" variant="info" {...buttonProps} disabled>
        Activated
      </Button>
    );
  }, [onInstall, installed]);

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
            <div className="small">
              {author && (
                <p className="mb-1 mt-1">
                  Personal <FontAwesomeIcon icon={faEyeSlash} />
                </p>
              )}

              {organization && (
                <p className="mb-1 mt-1">
                  {organization} <FontAwesomeIcon icon={faUsers} />
                </p>
              )}
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
  }
> = ({ buttonProps, recipes, installedRecipes, installRecipe }) => (
  <ListGroup>
    {(recipes ?? []).slice(0, 10).map((x) => (
      <Entry
        {...x}
        buttonProps={buttonProps}
        key={x.metadata.id}
        onInstall={async () => installRecipe(x)}
        installed={installedRecipes.has(x.metadata.id)}
      />
    ))}
    {recipes.length >= 10 && (
      <ListGroup.Item>
        <span className="text-muted">
          {recipes.length - 10} more result(s) not shown
        </span>
      </ListGroup.Item>
    )}
  </ListGroup>
);

const MarketplacePage: React.FunctionComponent<MarketplaceProps> = ({
  installRecipe,
  installedRecipes,
}) => {
  const { data: rawRecipes } = useFetch<RecipeDefinition[]>("/api/recipes/");
  const [query, setQuery] = useState("");
  const { flags, scope } = useContext(AuthContext);

  const recipes = useMemo(() => {
    // const normalQuery = (query ?? "").toLowerCase();
    // const filtered = (rawRecipes ?? []).filter(
    //   (x) =>
    //     query.trim() === "" ||
    //     x.metadata.name.toLowerCase().includes(normalQuery) ||
    //     x.metadata.description?.toLowerCase().includes(normalQuery)
    // );
    // return sortBy(filtered, (x) => x.metadata.name);

    const filtered = (rawRecipes ?? []).filter(
      (recipe) =>
        recipe.sharing.organizations.length > 0 || recipe.metadata.author
    );
    console.log(filtered);
    return filtered;
  }, [rawRecipes, query, scope]);

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

        {flags.includes("public_marketplace") && (
          <Col className="text-right">
            <a
              href="https://www.pixiebrix.com/marketplace"
              className="btn btn-primary"
            >
              Open Public Marketplace{" "}
              <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1" />
            </a>
          </Col>
        )}
      </Row>

      <Row>
        <Col xl={8} lg={10} md={12}>
          <Form>
            <InputGroup className="mb-2 mr-sm-2">
              <InputGroup.Prepend>
                <InputGroup.Text>Search</InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                id="query"
                placeholder="Start typing to filter blueprints"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
              />
            </InputGroup>
          </Form>
        </Col>
      </Row>

      <Row>
        <Col xl={8} lg={10} md={12}>
          {rawRecipes == null ? (
            <GridLoader />
          ) : (
            <RecipeList
              installedRecipes={installedRecipes}
              installRecipe={installRecipe}
              recipes={recipes}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

MarketplacePage.defaultProps = {
  installedRecipes: new Set(),
};

export default MarketplacePage;
