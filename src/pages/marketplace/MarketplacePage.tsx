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

const Entry: React.FunctionComponent<RecipeProps> = ({
  metadata: { id, name, description },
  onInstall,
  installed,
}) => {
  const installButton = useMemo(() => {
    if (!onInstall) {
      return null;
    } else if (!installed) {
      return (
        <Button size="sm" variant="primary" onClick={onInstall}>
          Install
        </Button>
      );
    } else {
      return (
        <Button size="sm" variant="primary" disabled>
          Installed
        </Button>
      );
    }
  }, [onInstall, installed]);

  return (
    <ListGroup.Item>
      <div className="d-flex w-100 justify-content-between">
        <h5 className="mb-0">{name}</h5>
        <code className="mb-1 pt-0">{id}</code>
      </div>
      <div className="d-flex w-100 justify-content-between">
        <p className="mb-1">{description}</p>
        {installButton}
      </div>
    </ListGroup.Item>
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
          Find and install pre-made blueprints for your favorite websites and
          SaaS apps
        </p>
      </div>

      <Row>
        <Col>
          <Form>
            <InputGroup className="mb-2 mr-sm-2">
              <InputGroup.Prepend>
                <InputGroup.Text>Search</InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                id="query"
                placeholder="Enter a search term"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
          </Form>
        </Col>
      </Row>

      <Row>
        <Col>
          {rawRecipes == null ? (
            <GridLoader />
          ) : (
            <ListGroup>
              {(recipes ?? []).slice(0, 10).map((x) => (
                <Entry
                  {...x}
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
