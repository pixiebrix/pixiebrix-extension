This directory contains yaml definition files for mods used in end to end tests. They are
used alongside the `modDefinitions` fixture to automatically create the specified mods
and handle their cleanup for each test.

Definition file names must be lowercase in dash-case. The definition yaml must contain a placeholder value
for the mod id, which will be replaced with the actual mod id when the mod is created. The placeholder
value is `"{{ modId }}"`.

Test Usage:

```
// Specify what mods to create and use in the test. In this case, a file named `mod-example-1.yaml` should be
// in the `modDefinitions` directory.
test.use({
  modDefinitions: ['mod-example-1'],
});

test('test name', async ({
  page,
  extensionId,
  createdModIds,
}) => {
  // Get the created mod Id from the `createdModIds` fixture
  const modExample1Id = createdModIds[0];
  // Activate the mod, etc.
});
```
