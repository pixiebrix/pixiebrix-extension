import {
  inferModComponentStateVersion,
  migrations,
} from "@/store/extensionsMigrations";
import { initialState } from "@/store/extensionsSliceInitialState";
import {
  getModComponentState,
  persistExtensionOptionsConfig,
} from "@/store/extensionsStorage";
import { getMaxMigrationsVersion } from "@/store/migratePersistedState";
import {
  readReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";

jest.mock("@/utils/storageUtils", () => {
  const actual = jest.requireActual("@/utils/storageUtils");

  return {
    ...actual,
    readReduxStorage: jest.fn(),
  };
});

const readReduxStorageMock = jest.mocked(readReduxStorage);
const inferModComponentStateVersionMock = jest.mocked(
  inferModComponentStateVersion
);

const STORAGE_KEY = validateReduxStorageKey("persist:extensionOptions");
describe("getModComponentState", () => {
  test("readReduxStorage is called with inferModComponentStateVersion", async () => {
    void getModComponentState();
    expect(readReduxStorageMock).toHaveBeenCalledWith(
      STORAGE_KEY,
      migrations,
      initialState,
      inferModComponentStateVersionMock
    );
  });
});

describe("persistExtensionOptionsConfig", () => {
  test("version is 1 higher than the highest migration version", () => {
    const maxVersion = getMaxMigrationsVersion(migrations);
    expect(persistExtensionOptionsConfig.version).toBe(maxVersion + 1);
  });
});
