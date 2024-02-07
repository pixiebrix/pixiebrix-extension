/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

const noNullRtkQueryArgs = require("./noNullRtkQueryArgs");
const { RuleTester } = require("eslint");

const expectedErrors = [
  {
    message:
      "Do not pass null as the first argument to RTK query hooks. If you need to pass no arguments, use undefined instead.",
  },
];

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
  },
});

ruleTester.run("noNullRtkQueryArgs", noNullRtkQueryArgs, {
  valid: [
    { code: "useFooQuery()" },
    { code: "useFooQuery('foo')" },
    { code: "useFooQuery({})" },
    { code: "useFooQuery(undefined)" },
    { code: "useFooQuery('foo', {})" },
    { code: "useFooQuery({}, {})" },
    { code: "useFooQuery(undefined, {})" },
    { code: "api.endpoints.foo.useQuery()" },
    { code: "api.endpoints.foo.useQuery(undefined)" },
    { code: "api.endpoints.foo.useQuery('foo')" },
    { code: "foo.useQuery()" },
    { code: "api.useFooQuery()" },
    { code: "api.endpoints.foo.useQuerySubscription()" },
    { code: "api.endpoints.foo.useQueryState()" },
    {
      code: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger(undefined);
      `,
    },
    {
      code: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger("arg");
      `,
    },
    {
      code: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger(123);
      `,
    },
    {
      code: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger(true);
      `,
    },
    {
      code: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger({});
      `,
    },
    {
      code: `
        const [trigger, { data }] = useLazyFooQuery();
        trigger(undefined);
      `,
    },
    {
      code: `
        const [trigger, { data }] = useLazyFooQuerySubscription();
        trigger(undefined);
      `,
    },
    {
      code: `
        const [foo] = usePrefetch();
        foo(undefined);
      `,
    },
  ],
  invalid: [
    {
      code: "useFooQuery(null)",
      errors: expectedErrors,
      output: "useFooQuery(undefined)",
    },
    {
      code: "useFooQuery(null, {})",
      errors: expectedErrors,
      output: "useFooQuery(undefined, {})",
    },
    {
      code: "useFooQuery(null)",
      errors: expectedErrors,
      output: "useFooQuery(undefined)",
    },
    {
      code: "useFooQuery(null, {})",
      errors: expectedErrors,
      output: "useFooQuery(undefined, {})",
    },
    {
      code: "api.endpoints.foo.useQuery(null)",
      errors: expectedErrors,
      output: "api.endpoints.foo.useQuery(undefined)",
    },
    {
      code: "api.useFooQuery(null)",
      errors: expectedErrors,
      output: "api.useFooQuery(undefined)",
    },
    {
      code: "api.endpoints.foo.useQuerySubscription(null)",
      errors: expectedErrors,
      output: "api.endpoints.foo.useQuerySubscription(undefined)",
    },
    {
      code: "api.endpoints.foo.useQueryState(null)",
      errors: expectedErrors,
      output: "api.endpoints.foo.useQueryState(undefined)",
    },
    {
      code: "const [foo] = useFooMutation(); foo(null);",
      errors: expectedErrors,
      output: "const [foo] = useFooMutation(); foo(undefined);",
    },
    {
      name: "calling the trigger function with null",
      code: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger(null);
      `,
      errors: expectedErrors,
      output: `
        const [trigger, { data }] = useUpdateFooMutation();
        trigger(undefined);
      `,
    },
    {
      code: `
        const [trigger, { data }] = useLazyFooQuery();
        trigger(null);
      `,
      errors: expectedErrors,
      output: `
        const [trigger, { data }] = useLazyFooQuery();
        trigger(undefined);
      `,
    },
    {
      code: `
        const [trigger, { data }] = useLazyFooQuerySubscription();
        trigger(null);
      `,
      errors: expectedErrors,
      output: `
        const [trigger, { data }] = useLazyFooQuerySubscription();
        trigger(undefined);
      `,
    },
    {
      code: `
        const [foo] = usePrefetch();
        foo(null);
      `,
      errors: expectedErrors,
      output: `
        const [foo] = usePrefetch();
        foo(undefined);
      `,
    },
  ],
});
