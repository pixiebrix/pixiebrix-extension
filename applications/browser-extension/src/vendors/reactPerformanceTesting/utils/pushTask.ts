export const pushTask = (callback: () => void) => {
  // Using `process.nextTick` instead of `setImmediate` that is not available in jest
  process.nextTick(callback);
};
