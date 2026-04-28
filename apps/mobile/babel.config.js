module.exports = function (api) {
  const isTest = api.env("test");
  return {
    presets: [
      ["babel-preset-expo", isTest ? {} : { jsxImportSource: "nativewind" }],
      ...(isTest ? [] : ["nativewind/babel"]),
    ],
    plugins: [],
  };
};
