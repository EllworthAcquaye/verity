/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "packages-never-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "domain-remains-framework-free",
      severity: "error",
      from: { path: "^packages/domain/" },
      to: { path: "^(apps/|packages/(contracts|data)/)" },
    },
    {
      name: "contracts-never-import-persistence",
      severity: "error",
      from: { path: "^packages/contracts/" },
      to: { path: "^(apps/|packages/data/)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(dist|generated|node_modules)/" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
  },
}
