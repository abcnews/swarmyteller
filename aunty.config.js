// const fs = require('fs');
// const path = require('path');
// const { ProvidePlugin } = require('webpack');

module.exports = {
  type: 'react',
  build: {
    entry: ['index', 'editor', 'googledoc']
  },
  serve: {
    hot: false
  },
  // webpack: config => {
  //   config.devtool = 'source-map';
  //
  //   config.plugins.push(
  //     new ProvidePlugin({
  //       process: 'process/browser'
  //     })
  //   );
  //
  //   return config;
  // },
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
