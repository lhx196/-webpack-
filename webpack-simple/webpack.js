const fs = require("fs")
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default
const path = require("path");
const babel = require("@babel/core");

module.exports = class webpack {
	constructor(options) {
		const { entry, output } = options;
		this.entry = entry;
		this.output = output;
		this.modules = [];
	}
	// 执行函数
	run() {
		// 开始分析入口模块
		const info = this.parse(this.entry)
		// 递归分析其他模块分析(引入import)
		this.modules.push(info);
		// 广度递归遍历 若a 里面含 b c ，b里面d 这modules的顺序是a处理完后，把处理后信息存到module中 遍历module中a的dep 在遍历时先处理b 再把b的信息放到modules中， 在循环第二个依赖，把c的信息放入modules中，后续遍历b中dep d
		for (let i = 0; i < this.modules.length; i++) {
			const item = this.modules[i]
			const { dependenices } = item;
			if (dependenices) {
				for (let j in dependenices) {
					// 重新计算length
					this.modules.push(this.parse(dependenices[j]))
				}
			}
		}
		const obj = {}
		this.modules.forEach(item => {
			obj[item.entryFile] = {
				dependenices: item.dependenices,
				code: item.code
			}
		})
		this.file(obj);
	}
	// 分析函数
	parse(entryFile) {
		// 分析入口模块的内容
		// console.log(entryFile)
		const content = fs.readFileSync(entryFile, "utf-8")
		// console.log(content)
		const ast = parser.parse(content, {
			// 表示解析的是es6 module模块
			sourceType: "module",
		});
		/** 
		 * ast.program.body 为经过parse解析后代码所在位置
		 * 其中type对应每段代码的类型
		 * 下方为ast语法树 引入import语句ast部分
		 Node: {
						type: 'ImportDeclaration',
						start: 0,
						end: 23,
						loc: SourceLocation {
						start: [Position],
						end: [Position],
						filename: undefined,
						identifierName: undefined
				},
				range: undefined,
				leadingComments: undefined,
				trailingComments: undefined,
				innerComments: undefined,
				extra: undefined,
				specifiers: [[Node]],
				source: Node {
						type: 'StringLiteral',
						start: 16,
						end: 23,
						loc: [SourceLocation],
						range: undefined,
						leadingComments: undefined,
						trailingComments: undefined,
						innerComments: undefined,
						extra: [Object],
						value: './add'
				}
		*/
		const dependenices = {};
		traverse(ast, {
			// 遍历ast语法树，收集当前文件的依赖
			// 上述注释中为import引入语句的ast语法树 其中type 类型为ImportDeclaration 因此这里ImportDeclaration(){}即指对import语句做处理
			// 此处返回ast type为ImportDeclaration的节点数据，下方代码用作收集依赖
			ImportDeclaration({ node }) {
				let dirname = path.dirname(entryFile);
				// 此处由于bundle打包运行文件是在webpack-simple文件下因此此处保存对应依赖格式 { './add': '../src/add.js', './minus': '../src/minus.js' }
				const abspath = path.join(dirname, node.source.value) + ".js";
				dependenices[node.source.value] = abspath.replace(/\\/g, "/");
			},
		});
		// console.log(dependenices)
		// ast es6 转 es5
		const { code } = babel.transformFromAst(ast, null, {
			presets: ["@babel/preset-env"],
		});
		return {
			entryFile,
			dependenices,
			code
		}
	}
	// 生成打包文件
	file(code) {
		// 创建自运行函数，处理require module exports等浏览器不支持方法
		// require 为import经过es5转换后生成的函数，但浏览器还是不支持
		/** 
			'var _default = function _default(a, b) {\n' +
      		'  return a + b;\n' +
      		'};\n' +
	  		'\n' +
	  	*/
		// export代码转换后 'exports["default"] = _default;' exports其实就是一个对象
		// absRequire --被打包代码中 import引入路径是相对于当前import文件的路径，然而打包的graph图谱保存的key值为相当于当前打包bundle文件的路径
		// 生成main.js => dist/main.js
		const filePath = path.join(this.output.path, this.output.filename).replace(/\\/g, "/");
		console.log(filePath)
		// 若不转换 自执行函数入参为([object Object])
		const newCode = JSON.stringify(code)
		// graph --依赖图谱
		const bundle = `(function(graph){
			function require(module){
				function absRequire(relPath) {
					return require(graph[module].dependenices[relPath]);
				}
				var exports = {};
				(function(require,exports,code){
					eval(code);
				})(absRequire,exports,graph[module].code)
				return exports
			}
			require('${this.entry}')
		})(${newCode})`
		fs.writeFileSync(filePath, bundle, "utf-8")
	}
}