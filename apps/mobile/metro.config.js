const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Inline requires defer module evaluation until first use. Big cold-start
// win on RN because most of the dependency graph never executes on the
// first screen. The default Metro transformer otherwise eagerly resolves
// every `require()` at module load.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = withNativeWind(config, { input: "./global.css" });
