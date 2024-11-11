// `jest-raw-loader` compatibility with Jest version 28.
// See: https://github.com/keplersj/jest-raw-loader/pull/239
const transformer = {
  process: (content) => ({
    code: "module.exports = " + JSON.stringify(content),
  }),
};

export default transformer;
