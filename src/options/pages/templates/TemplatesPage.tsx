/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import React, { useCallback, useMemo, useState } from "react";
import { useFetch } from "@/hooks/fetch";
import { RecipeDefinition } from "@/types/definitions";
import { PageTitle } from "@/layout/Page";
import { groupBy, sortBy } from "lodash";
import {
  faClipboardCheck,
  faExternalLinkAlt,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import {
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  ListGroup,
  Row,
} from "react-bootstrap";
import { InstallRecipe } from "@/pages/marketplace/MarketplacePage";
import { connect } from "react-redux";
import { OptionsState } from "@/options/slices";
import { push } from "connected-react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cx from "classnames";

import "./TemplatesPage.scss";

export interface TemplatesProps {
  installedRecipes: Set<string>;
  installRecipe: InstallRecipe;
}

export interface FeaturedRecipeDefinition extends RecipeDefinition {
  feature: {
    featured: true;
    shortName: string;
    categoryPrimary: string;
    categorySecondary: string;
  };
}

interface TemplateGroup {
  label: string;
  templates: FeaturedRecipeDefinition[];
}

interface GroupProps {
  install: InstallRecipe;
  installedRecipes: Set<string>;
  query: string;
  group: TemplateGroup;
}

const CATEGORY_SORT_ORDER = new Map<string, number>([
  ["Information", 1],
  ["Social", 2],
  ["Shopping", 3],
  ["Entertainment", 4],
]);

const TemplateGroup: React.FunctionComponent<GroupProps> = ({
  query,
  install,
  installedRecipes,
  group: { label, templates },
}) => {
  const filtered = useMemo(() => {
    const normalizeQuery = (query ?? "").trim().toLowerCase();
    const matches =
      normalizeQuery === ""
        ? templates
        : templates.filter((x) =>
            (x.feature.shortName ?? x.metadata.name)
              .toLowerCase()
              .includes(normalizeQuery)
          );
    return sortBy(matches, (x) => x.feature.shortName ?? x.metadata.name);
  }, [query, templates]);

  return (
    <Col md={4} lg={3} sm={6} xl={3} className="mt-2">
      <Card>
        <Card.Header className="text-center">{label}</Card.Header>
        <ListGroup variant="flush">
          {filtered.map((recipe) => (
            <TemplateEntry
              key={recipe.metadata.id}
              installed={installedRecipes.has(recipe.metadata.id)}
              onAdd={() => install(recipe)}
              {...recipe}
            />
          ))}
          {filtered.length === 0 && (
            <ListGroup.Item>
              <span className="text-muted">No templates found</span>
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card>
    </Col>
  );
};

const TemplateEntry: React.FunctionComponent<
  FeaturedRecipeDefinition & { installed: boolean; onAdd: () => void }
> = ({ feature, metadata, installed, onAdd }) => {
  return (
    <ListGroup.Item className="TemplateEntry">
      <div className="d-flex align-items-center">
        <div>
          {installed ? (
            <Button size="sm" variant="info" disabled>
              Added
            </Button>
          ) : (
            <Button size="sm" variant="info" onClick={onAdd}>
              Add
            </Button>
          )}
        </div>
        <div className="ml-3">{feature.shortName ?? metadata.name}</div>
      </div>
    </ListGroup.Item>
  );
};

const Category: React.FunctionComponent<{
  active?: boolean;
  inviteOnly?: boolean;
  title: string;
  subtitle: string;
}> = ({ title, subtitle, active, inviteOnly }) => {
  return (
    <Card className={cx("CategoryCard", { active, inviteOnly })}>
      <Card.Body>
        {inviteOnly && (
          <div className="ribbon">
            <span>Invite-Only</span>
          </div>
        )}
        <div className="CategoryCard__title">{title}</div>
        <div className="CategoryCard__subtitle">{subtitle}</div>
      </Card.Body>
    </Card>
  );
};

const TemplatesPage: React.FunctionComponent<
  TemplatesProps & { navigate: (url: string) => void }
> = ({ installedRecipes, navigate }) => {
  const install = useCallback(
    async (x: RecipeDefinition) => {
      navigate(`templates/activate/${encodeURIComponent(x.metadata.id)}`);
    },
    [navigate]
  );

  const rawRecipes: FeaturedRecipeDefinition[] = useFetch<
    FeaturedRecipeDefinition[]
  >("/api/featured/recipes/?category=search");
  const [query, setQuery] = useState("");

  const groupedRecipes = useMemo(() => {
    const groups = Object.entries(
      groupBy(rawRecipes ?? [], (x) => x.feature.categorySecondary)
    ).map(([label, templates]) => ({
      label,
      templates,
    }));
    return sortBy(groups, [
      (x) => CATEGORY_SORT_ORDER.get(x.label) ?? 999,
      (x) => x.label,
    ]);
  }, [rawRecipes]);

  return (
    <div className="marketplace-component">
      <PageTitle icon={faClipboardCheck} title="Templates" />
      <div className="pb-2">
        <p>
          Activate pre-made templates for you favorite web sites and apps. To
          edit them or create your own, follow our{" "}
          <a
            href="https://docs.pixiebrix.com/quick-start-guide"
            target="_blank"
            rel="noopener noreferrer"
          >
            Page Editor Quickstart <FontAwesomeIcon icon={faExternalLinkAlt} />
          </a>
        </p>
      </div>

      <Row>
        <Col>
          <div className="d-flex align-items-center">
            <Category active title="Context Menus" subtitle="Search" />
            <Category title="Context Menus" subtitle="Push Data" inviteOnly />
            <Category title="Buttons" subtitle="Search" inviteOnly />
            <Category title="Buttons" subtitle="Push Data" inviteOnly />
          </div>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col xl={6} lg={8} md={10}>
          <Card className="CategoryInfo">
            <Card.Body>
              <Card.Title>Context Menus for Search</Card.Title>

              <Card.Text className="text-info">
                <FontAwesomeIcon icon={faInfoCircle} /> Once you activate a
                template, you&apos;ll be able to right-click on any page to
                search selected text
              </Card.Text>

              <Form>
                <InputGroup className="mb-2 mr-sm-2">
                  <InputGroup.Prepend>
                    <InputGroup.Text>Search</InputGroup.Text>
                  </InputGroup.Prepend>
                  <Form.Control
                    id="query"
                    placeholder="Start typing to filter templates"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </InputGroup>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-2">
        {groupedRecipes.map((group) => (
          <TemplateGroup
            key={group.label}
            install={install}
            installedRecipes={installedRecipes}
            query={query}
            group={group}
          />
        ))}
      </Row>
    </div>
  );
};

TemplatesPage.defaultProps = {
  installedRecipes: new Set(),
};

export default connect(
  ({ options }: { options: OptionsState }) => ({
    installedRecipes: new Set(
      Object.values(options.extensions).flatMap((extensionPoint) =>
        Object.values(extensionPoint)
          .map((x) => x._recipeId)
          .filter((x) => x)
      )
    ),
  }),
  { navigate: push }
)(TemplatesPage);
