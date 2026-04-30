module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@core': './src/core',
            '@features': './src/features',
            '@lib': './src/lib',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.tsx', '.ts'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
