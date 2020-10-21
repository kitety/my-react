class Unit {
  // 父类保存参数
  constructor(element) {
    this.currentElement = element;
  }
}
// 方便扩展;
class ReactTextUnit extends Unit {
  // 每个类型都这样 不方便 因此写个父类
  // constructor(element) {
  //   this.element = element;
  // }
  // 每个类重写这个方法
  getMarkUp(rootId) {
    // 保存当前元素的id
    this._rootId = rootId;
    // 返回当前元素的html
    return `<span data-reactid="${rootId}">${this.currentElement}</span>`;
  }
}
class ReactNativeUnit extends Unit {
  // 每个类重写这个方法
  getMarkUp(rootId) {
    // 保存当前元素的id
    this._rootId = rootId;
    //  object 转换为 string
    // 拼接需要渲染的内容
    let { type, props } = this.currentElement;
    let tagStart = `<${type} data-reactid="${rootId}"`;
    let tagEnd = `</${type}>`;
    let contentStr = "";
    for (const propsName in props) {
      // 循环递归 children
      if (propsName === "children") {
        // 是个数组 返回['<span>你好</span>'，'<button>123</button>']
        contentStr = props[propsName]
          .map((child, index) => {
            // 递归 循环子节点
            let childInstance = createReactUnit(child);
            // 拿到一个字符串
            return childInstance.getMarkUp(`${rootId}.${index}`);
          })
          .join('');
      } else {
        // 拼接
        tagStart += `${propsName}="${props[propsName]}"`;
      }
    }
    return tagStart + ">" + contentStr + tagEnd;
  }
}

/**
 *
 * @param {*} element 字符串 number function class
 * @return 返回一个实例
 */
function createReactUnit(element) {
  // 先对字符串处理
  if (typeof element === "string" || typeof element === "number") {
    return new ReactTextUnit(element);
  } else if (typeof element === "object" && typeof element.type === "string") {
    // createElement创建的元素
    return new ReactNativeUnit(element);
  }
}
export default createReactUnit;
