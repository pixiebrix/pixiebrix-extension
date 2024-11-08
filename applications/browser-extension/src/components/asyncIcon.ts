import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { camelCase } from "lodash";
import { type IconStringDefinition } from "@/types/contract";
import { useEffect } from "react";
import {
  type IconName,
  type IconPrefix,
} from "@fortawesome/free-solid-svg-icons";
import useAsyncState from "../hooks/useAsyncState";
import { type Nullishable } from "../utils/nullishUtils";

type ModuleImport = Promise<{ definition: IconProp }>;

async function handleIconImport(moduleImport: ModuleImport): Promise<IconProp> {
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
 * @param iconDefinition the FontAwesome icon prefix and iconName as a string, e.g. "fas fa-coffee"
 */
async function fetchFortAwesomeIcon(
  iconDefinition: IconStringDefinition,
): Promise<IconProp> {
  const [prefix, iconName] = iconDefinition.split(" ") as [
    IconPrefix,
    IconName,
  ];

  switch (prefix) {
    // For the dynamic imports to work correctly with Webpack, they must be as explicit as possible
    case "fas": {
      return handleIconImport(
        import(
          /* webpackChunkName: "free-solid-svg-icons/[request]" */
          `@fortawesome/free-solid-svg-icons/${camelCase(iconName)}.js`
        ) as ModuleImport,
      );
    }

    case "fab": {
      return handleIconImport(
        import(
          /* webpackChunkName: "free-brands-svg-icons/[request]" */
          `@fortawesome/free-brands-svg-icons/${camelCase(iconName)}.js`
        ) as ModuleImport,
      );
    }

    case "far": {
      return handleIconImport(
        import(
          /* webpackChunkName: "free-regular-svg-icons/[request]" */
          `@fortawesome/free-regular-svg-icons/${camelCase(iconName)}.js`
        ) as ModuleImport,
      );
    }

    default: {
      throw new Error(`Unsupported FontAwesome prefix: ${prefix}`);
    }
  }
}

/**
 * Load a Font Awesome icon dynamically from the string prefix-iconName format
 * @param icon The string definition for the icon. Accepts undefined for better hook-ergonomics
 * with the api return type on fa_icon fields.
 * @param defaultIcon The default icon to use if the first parameter is undefined
 * @param placeholder The placeholder to use while loading a dynamic icon. Defaults to using defaultIcon.
 *
 * @returns The dynamic icon if loaded, the placeholder if provided and the icon is loading,
 * otherwise the defaultIcon.
 */
export function useAsyncIcon(
  icon: Nullishable<IconStringDefinition>,
  defaultIcon: IconProp,
  placeholder: IconProp = defaultIcon,
): IconProp {
  const { data: value, error } = useAsyncState(
    async () => {
      if (icon == null) {
        return defaultIcon;
      }

      return fetchFortAwesomeIcon(icon);
    },
    [icon, defaultIcon],
    {
      initialValue: placeholder,
    },
  );

  useEffect(() => {
    if (error) {
      console.warn("Error loading async icon", error);
    }
  }, [error]);

  // Null-coalesce in case of error, when value will be set to undefined
  return value ?? defaultIcon;
}
