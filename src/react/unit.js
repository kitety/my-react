import $ from "jquery";
import { Element } from "./element";
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
// React.createElement("div", null, "hello ", /*#__PURE__*/React.createElement("span", null, "3423432"));
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
    let childStr = "";
    for (const propsName in props) {
      // 绑定事件
      if (/on[A-Z]/.test(propsName)) {
        let eventType = propsName.slice(2).toLowerCase(); //click
        // 事件委托  目标元素还是一个字符串
        // react 里面的事件 事件委托  namespace 方便取消事件
        $(document).on(
          `${eventType}.${rootId}`,
          `[data-reactid="${rootId}"]`,
          props[propsName]
        );
      } else if (propsName === "style") {
        let styleObj = props[propsName];
        let styles = Object.entries(styleObj)
          .map(([attr, value]) => {
            attr = attr.replace(
              /[A-Z]/g,
              (group1) => `-${group1.toLowerCase()}`
            );
            return `${attr}:${value}`;
          })
          .join(";");
        tagStart += ` style="${styles}" `;
      } else if (propsName === "className") {
        tagStart += ` class="${props[propsName]}" `;
      }
      // 循环递归 children
      else if (propsName === "children") {
        // 是个数组 返回['<span>你好</span>'，'<button>123</button>']
        childStr = props[propsName]
          .map((child, index) => {
            // 递归 循环子节点
            let childInstance = createReactUnit(child);
            // 拿到一个字符串
            return childInstance.getMarkUp(`${rootId}.${index}`);
          })
          .join("");
      } else {
        // 拼接
        tagStart += `${propsName}="${props[propsName]}"`;
      }
    }
    // 返回拼接后的字符串
    return tagStart + ">" + childStr + tagEnd;
  }
}
// 负责渲染react组件;
class ReactCompositeUnit extends Unit {
  getMarkUp(rootId) {
    this._rootId = rootId;
    // new Component 调用render函数
    let { type: Component, props } = this.currentElement;
    // 实例化
    let componentInstance = new Component(props);
    // 先父亲后儿子
    componentInstance.componentWillMount &&
      componentInstance.componentWillMount();

    // 执行实例的render函数
    let reactComponentRenderer = componentInstance.render(); // number  div  ...
    // 递归渲染组件 render后的返回结果
    // 返回一个实例
    let reactCompositUnitInstance = createReactUnit(reactComponentRenderer);
    let markUp = reactCompositUnitInstance.getMarkUp(rootId);
    // 先儿子后父亲
    // 递归后绑定的事件 这样的话就是儿子的先挂载  子组件经过人的render之后就会绑定
    $(document).on("mounted", () => {
      componentInstance.componentDidMount &&
        componentInstance.componentDidMount();
    });
    return markUp; // 实现把render方法返回的结果 作为字符串返回回去
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
  } else if (element instanceof Element && typeof element.type === "string") {
    // createElement创建的元素
    return new ReactNativeUnit(element);
  }
  // element.type function
  else if (element instanceof Element && typeof element.type === "function") {
    // class对相应的情况
    return new ReactCompositeUnit(element);
  }
}
export default createReactUnit;
