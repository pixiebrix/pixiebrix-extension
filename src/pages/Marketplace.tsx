import React, { useCallback, useMemo } from "react";
import { connect } from "react-redux";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useToasts } from "react-toast-notifications";
import { useFetch } from "@/hooks/fetch";
import { GridLoader } from "react-spinners";
import { optionsSlice, OptionsState } from "@/designer/options/slices";
import { PageTitle } from "@/designer/options/layout/Page";
import Rollbar from "rollbar";
import { ensureRecipePermissions } from "@/permissions";
import sortBy from "lodash/sortBy";
import { faStoreAlt } from "@fortawesome/free-solid-svg-icons";
import { Metadata } from "@/core";
import { RecipeDefinition } from "@/types/definitions";

import "./Marketplace.scss";

const { installRecipe } = optionsSlice.actions;

type Install = ({ recipe }: { recipe: RecipeDefinition }) => void;

interface RecipeProps {
  metadata: Metadata;
  installed: boolean;
  onInstall: () => void;
}

const Recipe: React.FunctionComponent<RecipeProps> = ({
  metadata: { name, description, author },
  onInstall,
  installed,
}) => {
  return (
    <div className="col-md-4 col-lg-3 col-sm-2">
      <Card style={{ width: "19rem", minWidth: "19em" }} className="mb-4">
        <Card.Header>{name}</Card.Header>
        <Card.Body>
          <Card.Text>{description}</Card.Text>
          {!installed ? (
            <Button variant="primary" onClick={onInstall}>
              Install
            </Button>
          ) : (
            <Button variant="primary" disabled>
              Installed
            </Button>
          )}
        </Card.Body>
        <Card.Footer>
          <small className="text-muted">
            Made with&nbsp;✨️&nbsp;&nbsp;by {author}
          </small>
        </Card.Footer>
      </Card>
    </div>
  );
};

function useInstall(
  installRecipe: Install
): (recipe: RecipeDefinition) => Promise<void> {
  const { addToast } = useToasts();
  return useCallback(
    async (recipe) => {
      try {
        if (!(await ensureRecipePermissions(recipe))) {
          addToast(
            `You must accept permissions for ${recipe.metadata.name} to install it`,
            {
              appearance: "error",
              autoDismiss: true,
            }
          );
          return;
        }
        installRecipe({ recipe });
        addToast(`Installed ${recipe.metadata.name}`, {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (ex) {
        // @ts-ignore: need to figure out how to import rollbar correctly in typescript
        Rollbar.error(ex);
        console.error(`Error installing ${recipe.metadata.name}`, ex);
        addToast(`Error installing ${recipe.metadata.name}`, {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [installRecipe, addToast]
  );
}

interface MarketplaceProps {
  installedRecipes: Set<string>;
  installRecipe: Install;
}

const Marketplace: React.FunctionComponent<MarketplaceProps> = ({
  installRecipe,
  installedRecipes,
}) => {
  const rawRecipes = useFetch("/api/recipes/") as RecipeDefinition[];

  const recipes = useMemo(
    () =>
      rawRecipes ? sortBy(rawRecipes, (x) => x.metadata.name) : rawRecipes,
    [rawRecipes]
  );

  const install = useInstall(installRecipe);

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
        {(recipes ?? []).map((x) => (
          <Recipe
            key={x.metadata.id}
            {...x}
            onInstall={() => install(x)}
            installed={installedRecipes.has(x.metadata.id)}
          />
        ))}
        {recipes == null && <GridLoader />}
      </Row>
    </div>
  );
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
  { installRecipe }
)(Marketplace);
