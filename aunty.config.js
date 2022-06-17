const { resolve } = require('path');

module.exports = {
  build: {
    includedDependencies: [/d3-/, 'delauneator']
  },
  serve: {
    hot: false
  }
};
