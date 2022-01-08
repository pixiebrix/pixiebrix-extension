import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { camelCase } from "lodash";

export type FortAwesomeLibrary = "fas" | "fab" | "far";

async function handleIconImport(
  moduleImport: Promise<{ definition: IconProp }>
): Promise<IconProp> {
  try {
    const { definition } = await moduleImport;
    return definition;
  } catch (error) {
    console.warn("Error importing FontAwesome icon library module", { error });
    throw error;
  }
}

/**
 * Asynchronously fetch a FortAwesome icon definition
 * @param library the FontAwesome library code ("fas", "fab", "far")
 * @param icon Must be in "fa-my-icon" format
 */
export async function fetchFortAwesomeIcon(
  library: FortAwesomeLibrary,
  icon: string
): Promise<IconProp> {
  switch (library) {
    // For the dynamic imports to work correctly with Webpack, they must be as explicit as possible
    case "fas": {
      return handleIconImport(
        import(
          /* webpackChunkName: "free-solid-svg-icons/[request]" */
          `@fortawesome/free-solid-svg-icons/${camelCase(icon)}.js`
        )
      );
    }

    case "fab": {
      return handleIconImport(
        import(
          /* webpackChunkName: "free-brands-svg-icons/[request]" */
          `@fortawesome/free-brands-svg-icons/${camelCase(icon)}.js`
        )
      );
    }

    case "far": {
      return handleIconImport(
        import(
          /* webpackChunkName: "free-regular-svg-icons/[request]" */
          `@fortawesome/free-regular-svg-icons/${camelCase(icon)}.js`
        )
      );
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for `never`
      throw new Error(`Unknown FontAwesome library: ${library}`);
    }
  }
}
