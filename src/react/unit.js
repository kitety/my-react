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
  update(nextElement) {
    // ？？
    // const nextElementStr = `<span data-reactid="${this._rootId}">${nextElement}</span>`;
    if (this.currentElement !== nextElement) {
      this.currentElement = nextElement;
      // 都是通过data-reactid属性来更新的
      $(`[data-reactid="${this._rootId}"]`).html(nextElement);
    }
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
  /*
  _componentInstance 当前的组件实例
  _renderedUnitInstance 当前组件render方法返回的react元素对应的unit currentElement指向react元素
  */
  getMarkUp(rootId) {
    this._rootId = rootId;
    // new Component 调用render函数
    let { type: Component, props } = this.currentElement;
    // componentInstance 就是Component的实例
    // 后面还会用到 因此缓存 this._componentInstance
    // 实例化                        Counter 当前组件的实例
    let componentInstance = (this._componentInstance = new Component(props));
    // 让组件的实例的_currentUnit属性等于当前的Unit 更新会勇担
    componentInstance._currentUnit = this;
    // 先父亲后儿子 生命周期
    componentInstance.componentWillMount &&
      componentInstance.componentWillMount();

    // 执行实例的render函数
    let reactComponentRenderer = componentInstance.render(); // number  div  ...
    // 递归渲染组件 render后的返回结果 得到unit
    // 返回一个实例                               组件的render的实例，返回的react元素对应的unit currentElement->react元素 （缓存一下 更新会用）
    let reactCompositeUnitInstance = (this._renderedUnitInstance = createReactUnit(
      reactComponentRenderer
    ));
    // 通过unit可以获得他的html 标记markup 返回一个string // 递归
    let markUp = reactCompositeUnitInstance.getMarkUp(rootId);
    // 先儿子后父亲
    // 递归后绑定的事件 这样的话就是儿子的先挂载  子组件经过人的render之后就会绑定
    $(document).on("mounted", () => {
      componentInstance.componentDidMount &&
        componentInstance.componentDidMount();
    });
    return markUp; // 实现把render方法返回的结果 作为字符串返回回去
  }
  // 处理组件的更新操作
  update(nextElement, partialState) {
    // 获取新的元素
    this.currentElement = nextElement || this.currentElement;
    // 获取新的状态 合并,不管是否更新组件 组件状态定会更改
    let nextState = Object.assign(this._componentInstance.state, partialState);
    let nextProps = this.currentElement.props;
    // 询问是否更新
    if (
      this._componentInstance.shouldComponentUpdate &&
      !this._componentInstance.shouldComponentUpdate(nextProps, nextState)
    ) {
      return;
    }
    // 下面进行DOM diff 比较更新。 两次的render结果
    // 上次的单元
    let preRenderUnitInstance = this._renderedUnitInstance;
    // 上次渲染的元素
    let preRenderElement = preRenderUnitInstance.currentElement;
    // diff
    let nextRenderElement = this._componentInstance.render();
    // 判断是否进行深度比较
    //如果新旧元素类型一样 深度比较 否则新的替换老的  同级比较
    if (shouldDeepCompare(preRenderElement, nextRenderElement)) {
      // update 传入新的element
      // 如果可以进行新比较 则把更新的工作交给上次渲染出来的那个element元素对应的unit来处理
      preRenderUnitInstance.update(nextRenderElement);
      this._renderedUnitInstance.componentDidUpdate &&
        this._renderedUnitInstance.componentDidUpdate();
    } else {
      this._renderedUnitInstance = createReactUnit(nextRenderElement);
      let nextMarkUp = this._renderedUnitInstance.getMarkUp(this._rootId);
      $(`[data-reactid="${this._rootId}"]`).replaceWith(nextMarkUp);
    }
  }
}

/**
 * 判断是否进行深度比较 判断类型是否一样
 * @param {*} preRenderElement 先前的元素
 * @param {*} nextRenderElement 下一个元素
 */
function shouldDeepCompare(oldElement, newElement) {
  if (oldElement !== null && newElement !== null) {
    let oldType = typeof oldElement;
    let newType = typeof newElement;
    // 文本数字
    if (
      (oldType === "string" || oldType === "number") &&
      (newType === "string" || newType === "number")
    ) {
      return true;
    }
    // 元素
    if (oldElement instanceof Element && newElement instanceof Element) {
      return oldType === newType;
    }
  }
  return false;
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
