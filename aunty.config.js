const fs = require('fs');
const path = require('path');
const { ProvidePlugin } = require('webpack');

module.exports = {
  type: 'react',
  build: {
    entry: ['index', 'editor']
  },
  serve: {
    hot: false
  },
  webpack: config => {
    config.devtool = 'source-map';
    const rules = config.module.rules;

    // Stop `import()`-ed chunks from being split into `[name].js` and `vendors~[name].js`
    config.optimization = {
      ...(config.optimization || {}),
      splitChunks: {
        cacheGroups: {
          vendors: false
        }
      }
    };

    // Polyfill some node.js APIs via module resolution fallbacks
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      stream: require.resolve('stream-browserify')
    };

    config.plugins.push(
      new ProvidePlugin({
        process: 'process/browser'
      })
    );

    return config;
  },
  // deploy: [
  //   {
  //     to: '/www/res/sites/news-projects/<name>/<id>'
  //   },
  //   config => {
  //     fs.writeFileSync(
  //       path.join(__dirname, 'redirect', 'index.js'),
  //       `window.location = String(window.location).replace('/latest/', '/${config.id}/')`
  //     );
  //
  //     return {
  //       ...config,
  //       from: 'redirect',
  //       to: '/www/res/sites/news-projects/<name>/latest'
  //     };
  //   }
  // ]
};
