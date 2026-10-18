const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Restrict watchFolders to app directory to avoid ENOENT crashes on root/monorepo folders
config.watchFolders = [__dirname, path.resolve(__dirname, '..', 'node_modules')];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

module.exports = config;
