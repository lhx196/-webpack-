// 获取主入口文件内容
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const path = require("path");
const babel = require("@babel/core");

//获取文件 依赖集合 代码
const getModuleInfo = (file) => {
  const body = fs.readFileSync(file, "utf-8");
  const ast = parser.parse(body, {
    sourceType: "module", // 表示解析的是es6模块
  });

  // traverse 负责解析ast语法数  --获取文件依赖

  const deps = {}; // 收集依赖路径
  traverse(ast, {
    // 遍历ast语法树，收集当前文件的依赖
    ImportDeclaration({ node }) {
      const dirname = path.dirname(file);
      const abspath = "./" + path.join(dirname, node.source.value) + ".js";
      deps[node.source.value] = abspath.replace(/\\/g, "/");
    },
  });

  // ast es6 转 es5
  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });

  const moduleInfo = { file, deps, code };

  return moduleInfo;
};
// getModuleInfo('./src/index.js')

// 获取所有的依赖code  获取当前文件code 依赖后，判断该文件是否还有其他依赖，递归调用继续获取子文件的依赖
const parseModules = (file) => {
  const depsGraph = {};
  // 获取入口文件信息
  const entry = getModuleInfo(file); //读取文件js，js依赖，js内代码
  const temp = [entry]; // 收集所有依赖  --逐层收集，最后放在temp中
  for (let i = 0; i < temp.length; i++) {
    const deps = temp[i].deps;
    if (deps) {
      for (const key in deps) {
        // for in遍历自身可枚举属性（自有属性，继承原形属性）
        if (deps.hasOwnProperty(key)) {
          // 判断对象是否包含特定的自身（非继承）属性。  --去除继承
          temp.push(getModuleInfo(deps[key]));
        }
      }
    }
  }
  temp.forEach((moduleInfo) => {
    const { file, deps, code } = moduleInfo;
    depsGraph[file] = { deps, code };
  });
  //   console.log(depsGraph)
  return depsGraph;
};

// 返回浏览器可执行代码
const bundle = (file) => {
  // 转成字符串(最后要生成字符串content 写入js文件中) 处理完两个关键字再返回字符串(import转成的require export等关键字)
  // 文件内code经过编译后，依赖生成export对象，再把该对象导出，
    const depsGraph = JSON.stringify(parseModules(file)); 
  return `(function (graph) {
    function require(file) {
      function absRequire(relPath) {
        return require(graph[file].deps[relPath]);
      }
      var exports = {};
      (function (require, exports, code) {
        eval(code);
      })(absRequire, exports, graph[file].code);
      return exports; 
    }
    require('${file}');
  })(${depsGraph});`;
  /** 
    const depsGraph = parseModules(file);
    (function (graph) {
        // console.log(graph);
        function require(file) {
        // 转化绝对路径函数  eval代码内路径为相对路径 './add'等，而grah中是'./src/add.add.js'
        function absRequire(relPath) {
            // 当读取的jscode内有依赖时，dep有记载绝对路径，deps: { './add': './src/add.js', './minus': './src/minus.js' }
            return require(graph[file].deps[relPath]);
        }
        var exports = {};
        (function (require, exports, code) {
            //用函数内局部变量代替外层的require， 让eval jscode 调用absRequire,把相对路径转成绝对路径
            //   index里面 包含require './add' 通过再次调用后，把返回的值存进require闭包中的export对象中，再把export对象用变量接住，供匿名自调用函数eval执行代码时使用
            eval(code);
        })(absRequire, exports, graph[file].code);
        return exports; // 把依赖执行后的jscode 往外导出，在最外层eval执行中可直接使用
        }
        require(file);
    })(depsGraph);
  */
};

const content = bundle("./src/index.js");

// 写入dist中
fs.mkdirSync('./dist')
fs.writeFileSync('./dist/bundle.js',content)

