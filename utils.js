export function isTestFile(filename) {
  return (
    filename.includes("__tests__") ||
    /\.test\./.test(filename) ||
    /\.spec\./.test(filename)
  );
}
