# Directory

This is a partial import of [react-performance-testing](https://github.com/keiya01/react-performance-testing) library that is slightly adapted for the project.

The changes are:

1. exclude references of `react-native`
2. replace the `setImmediate` (not available in jest environment) for `process.nextTick`, see `./utils/pushTask.ts`
