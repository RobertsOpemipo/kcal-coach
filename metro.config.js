const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Let the bundled scan model (.tflite) be required as an asset.
config.resolver.assetExts.push('tflite');

module.exports = config;
