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

import React, { useMemo, useState } from "react";
import { useFetch } from "@/hooks/fetch";
import { GridLoader } from "react-spinners";
import { PageTitle } from "@/layout/Page";
import sortBy from "lodash/sortBy";
import { faStoreAlt } from "@fortawesome/free-solid-svg-icons";
import { Metadata } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { Col, InputGroup, ListGroup, Row, Button, Form } from "react-bootstrap";
import "./MarketplacePage.scss";
import { ButtonProps } from "react-bootstrap/Button";

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
  metadata: { id, name, description },
  buttonProps = {},
  onInstall,
  installed,
}) => {
  const installButton = useMemo(() => {
    if (!onInstall) {
      return null;
    } else if (!installed) {
      return (
        <Button size="sm" variant="info" {...buttonProps} onClick={onInstall}>
          Add
        </Button>
      );
    } else {
      return (
        <Button size="sm" variant="info" {...buttonProps} disabled>
          Added
        </Button>
      );
    }
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
              <span className="text-monospace">id:</span>{" "}
              <code className="pl-0 ml-0">{id}</code>
            </div>
          </div>
          <div>
            <p className="mb-1 mt-1">{description}</p>
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
> = ({ buttonProps, recipes, installedRecipes, installRecipe }) => {
  return (
    <ListGroup>
      {(recipes ?? []).slice(0, 10).map((x) => (
        <Entry
          {...x}
          buttonProps={buttonProps}
          key={x.metadata.id}
          onInstall={() => installRecipe(x)}
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
};

const MarketplacePage: React.FunctionComponent<MarketplaceProps> = ({
  installRecipe,
  installedRecipes,
}) => {
  const rawRecipes = useFetch("/api/recipes/") as RecipeDefinition[];
  const [query, setQuery] = useState("");

  const recipes = useMemo(() => {
    const normalQuery = (query ?? "").toLowerCase();
    const filtered = (rawRecipes ?? []).filter(
      (x) =>
        query.trim() === "" ||
        x.metadata.name.toLowerCase().includes(normalQuery) ||
        x.metadata.description?.toLowerCase().includes(normalQuery)
    );
    return sortBy(filtered, (x) => x.metadata.name);
  }, [rawRecipes, query]);

  return (
    <div className="marketplace-component">
      <PageTitle icon={faStoreAlt} title="Marketplace" />
      <div className="pb-4">
        <p>
          Find and activate pre-made blueprints for your favorite websites and
          SaaS apps
        </p>
      </div>

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
                onChange={(e) => setQuery(e.target.value)}
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
