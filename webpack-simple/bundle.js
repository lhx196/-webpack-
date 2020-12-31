// 执行webpack构建入口
// 1’拿到webpack.config.js配置
const options = require("./webpack.config")
const webpack = require("./webpack")

new webpack(options).run()