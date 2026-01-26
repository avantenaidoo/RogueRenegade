export function calculateCodeMetrics(code: string) {
  const lines = code.split("\n").length;
  const functions = (code.match(/function\s+\w+/g) || []).length;
  const classes = (code.match(/class\s+\w+/g) || []).length;
  return { lines, functions, classes };
}

export function calculateTestCoverage(testsPassed: number, totalTests: number) {
  return Math.round((testsPassed / totalTests) * 100);
}