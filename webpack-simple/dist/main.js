(function(graph){
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
			require('../src/index.js')
		})({"../src/index.js":{"dependenices":{"./add":"../src/add.js","./minus":"../src/minus.js"},"code":"\"use strict\";\n\nvar _add = _interopRequireDefault(require(\"./add\"));\n\nvar _minus = require(\"./minus\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { \"default\": obj }; }\n\nvar sum = (0, _add[\"default\"])(1, 2);\nvar division = (0, _minus.minus)(2, 1);\nconsole.log(sum);\nconsole.log(division);"},"../src/add.js":{"dependenices":{},"code":"\"use strict\";\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports[\"default\"] = void 0;\n\nvar _default = function _default(a, b) {\n  return a + b;\n};\n\nexports[\"default\"] = _default;"},"../src/minus.js":{"dependenices":{},"code":"\"use strict\";\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.minus = void 0;\n\nvar minus = function minus(a, b) {\n  return a - b;\n};\n\nexports.minus = minus;"}})