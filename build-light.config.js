const path = require('path')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
const template = 'light'

const entryFiles = [
  path.join(__dirname, template, 'src/js', 'core.js'),
  path.join(__dirname, template, 'src/scss', 'core.scss')
]

module.exports = {
  mode: 'development',
  entry: entryFiles,
  output: {
    filename: 'js/bundle.js',
    path: path.resolve(__dirname, template + '/dist')
  },
  module: {
    rules: [{
      test: /.jsx?$/,
      include: [
        path.resolve(__dirname, template + '/src/js')
      ],
      exclude: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, 'bower_components')
      ],
      loader: 'babel-loader',
      query: {
        presets: ['env']
      }
    },
    { // sass / scss loader for webpack
      test: /.scss?$/,
      loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
      /* compressed
      loader: ExtractTextPlugin.extract(['css-loader?-minimize', 'sass-loader?outputStyle=compressed'])
      */
    }]
  },
  plugins: [
    new ExtractTextPlugin({ // define where to save the file
      filename: 'css/bundle.min.css',
      allChunks: true
    })
  ],
  resolve: {
    extensions: ['.json', '.js', '.jsx', '.css', '.scss']
  },
  devtool: 'source-map',
  watch: true,
  watchOptions: {
    ignored: /node_modules/
  }
}
