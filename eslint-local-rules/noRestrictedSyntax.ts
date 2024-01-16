/** @file File that verifies rules in `no-restricted-syntax`. Each line MUST be preceded by `eslint-disable-next-line` */

// eslint-disable-next-line no-restricted-syntax
export const id = crypto.randomUUID();

// eslint-disable-next-line no-restricted-syntax
export const url = browser.runtime.getURL("options.html");

// eslint-disable-next-line no-restricted-syntax
export const alertMock = alert as jest.Mock<typeof alert>;

// eslint-disable-next-line no-restricted-syntax
export const alertMockedFunction = alert as jest.MockedFunction<typeof alert>;

// eslint-disable-next-line no-restricted-syntax
export const mockPromise = jest.fn().mockResolvedValue(undefined);
