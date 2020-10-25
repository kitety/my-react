import $ from "jquery";
import { Element } from "./element";
import types from "./types";

let diffQueue = []; // 差异队列
let updateDepth = 0; // 更新级别 往下面一层 +1 出来一层-1
class Unit {
  // 父类保存参数
  constructor(element) {
    this.currentElement = element;
  }
  getMarkUp () {
    throw Error('此方法不能被调用');
  }
}
// 方便扩展;
class ReactTextUnit extends Unit {
  // 每个类型都这样 不方便 因此写个父类
  // constructor(element) {
  //   this.element = element;
  // }
  // 每个类重写这个方法
  getMarkUp (rootId) {
    // 保存当前元素的id
    this._rootId = rootId;
    // 返回当前元素的html
    return `<span data-reactid="${rootId}">${this.currentElement}</span>`;
  }
  update (nextElement) {
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
  getMarkUp (rootId) {
    // 保存当前元素的id
    this._rootId = rootId;
    //  object 转换为 string
    // 拼接需要渲染的内容
    let { type, props } = this.currentElement;
    let tagStart = `<${type} data-reactid="${rootId}"`;
    let tagEnd = `</${type}>`;
    let childStr = "";
    this._renderedChildrenUnits = []; // 已经渲染的儿子节点的单元unit dom diff
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
            // 每个unit有个_mountIndex属性
            childInstance._mountIndex = index; // 指向自己在父节点中的索引位置
            // 每个子元素的实例
            this._renderedChildrenUnits.push(childInstance);
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
  update (nextElement) {
    // 新旧属性
    let oldProps = this.currentElement.props;
    let newProps = nextElement.props;
    // 更新属性
    this.updateDomProperties(oldProps, newProps);
    this.updateDomChildren(nextElement.props.children);
  }
  updateDomProperties (oldProps, newProps) {
    // 删掉老属性有 新属性无的属性
    for (const propsName in oldProps) {
      if (!newProps.hasOwnProperty(propsName)) {
        // 删掉没有的属性
        $(`[data-reactid="${this._rootId}"]`).removeAttr(propsName);
      }
      if (/^on[A-Z]/.test(propsName)) {
        $(document).off(`.${this._rootId}`);
      }
    }
    // 避免多次绑定 就先把上面的事件全部去取消  因为 下面的操作会重新绑定
    for (const propsName in newProps) {
      // 先不处理 深度优先
      if (propsName === "children") {
        continue;
      } else if (/on[A-Z]/.test(propsName)) {
        let eventType = propsName.slice(2).toLowerCase(); //click
        // 事件委托  目标元素还是一个字符串
        // react 里面的事件 事件委托  namespace 方便取消事件
        $(document).on(
          `${eventType}.${this._rootId}`,
          `[data-reactid="${this._rootId}"]`,
          newProps[propsName]
        );
      } else if (propsName === "className") {
        // $(`[data-reactid="${this._rootId}"]`)[0].className =newProps[propsName];
        $(`[data-reactid="${this._rootId}"]`).attr(
          "class",
          newProps[propsName]
        );
      } else if (propsName === "style") {
        let styleObj = newProps[propsName];
        Object.entries(styleObj).map(([attr, value]) => {
          attr = attr.replace(/[A-Z]/g, (group1) => `-${group1.toLowerCase()}`);
          $(`[data-reactid="${this._rootId}"]`).css(attr, value);
        });
      } else {
        $(`[data-reactid="${this._rootId}"]`).prop(
          propsName,
          newProps[propsName]
        );
      }
    }
  }
  //  传入新的children ，和旧的对比，找出差异
  updateDomChildren (newChildrenElement) {
    // 记录update
    updateDepth++
    // 队列和新的children
    this.diff(diffQueue, newChildrenElement);
    updateDepth--
    // 意味着整个树遍历完成 深度优先
    if (updateDepth === 0) {
      this.patch(diffQueue)
      diffQueue = []
    }
  }
  patch (diffQueue) {
    console.log('====================================');
    console.log(diffQueue);
    console.log('====================================');
    // 所有将要删除的节点
    let deletedChildren = []
    // 暂存能复用的节点 移动啥的
    let deleteMap = {}
    for (let i = 0; i < diffQueue.length; i++) {
      // 取出一个
      const difference = diffQueue[i];
      // 要删除的节点  直接删除 间接删除
      // 先删除再插入
      if (difference.type === types.MOVE || difference.type === types.REMOVE) {
        // 取出索引
        let fromIndex = difference.fromIndex
        // 取出老元素
        let oldChild = $(difference.parentNode.children().get(fromIndex))
        deleteMap[fromIndex] = oldChild
        deletedChildren.push(oldChild)
      }
      $.each(deletedChildren, (index, item) => $(item).remove())
      for (let i = 0; i < diffQueue.length; i++) {
        const difference = diffQueue[i];
        switch (difference.type) {
          case types.INSERT:
            this.insertChildAt(difference.parentNode, difference.toIndex, $(difference.markUp));
            break;

          case types.MOVE:
            this.insertChildAt(difference.parentNode, difference.toIndex, deleteMap[difference.fromIndex]);
            break;

          default:
            break;
        }

      }
    }
  }
  insertChildAt (parentNode, index, newNode) {
    // 判断index是否占用
    let oldChild = parentNode.children().get(index);
    // 有节点插入到前面 没有的话插入到后面
    oldChild ? newNode.insertBefore(oldChild) : newNode.appendTo(parentNode)

  }

  /**
   *
   * @param {*} diffQueue 队列
   * @param {*} newChildrenElement  newChildrenElement
   */
  diff (diffQueue, newChildrenElement) {
    console.log(
      newChildrenElement
    );
    // 每个节点生成unit
    // _renderedChildrenUnits 已经渲染的儿子节点的单元unit
    // 第一步 MAP KEY 对应老的unit
    let oldChildrenUnitMap = this.getOldChildrenMap(
      this._renderedChildrenUnits
    );
    /**
     * 1.先找找老的有没有老的集合里面有没有能用的 有就复用  或者更新属性 没有的话就创建
     * 第二部 商城一个新的儿子unit的数组
     */
    let { newChildrenUnits, newChildrenUnitMap } = this.getNewChildren(
      oldChildrenUnitMap,
      newChildrenElement
    );
    // 老的节点根据操作如何才能得到新的节点状态
    // lastIndex 上一个已经确定位置的索引 最后一个不需要动的索引
    let lastIndex = 0;
    for (let i = 0; i < newChildrenUnits.length; i++) {
      const newUnit = newChildrenUnits[i];
      let newKey =
        (newUnit.currentElement &&
          newUnit.currentElement.props &&
          newUnit.currentElement.props.key) ||
        i.toString();
      let oldChildUnit = oldChildrenUnitMap[newKey];
      // 比较index index小的动
      if (oldChildUnit === newUnit) {
        // 一样 复用老节点 引用类型 可以比较  同一个对象 可以复用
        if (oldChildUnit._mountIndex < lastIndex) {
          // old节点移动
          diffQueue.push({
            parentId: this._rootId,
            parentNode: $(`[data-reactid="${this._rootId}"]`), // dom元素
            type: types.MOVE,
            fromIndex: oldChildUnit._mountIndex,
            toIndex: i, // 移动到当前位置i
          });
        }
        // 取较大值
        lastIndex = Math.max(lastIndex, oldChildUnit._mountIndex);
      } else {
        // 新的节点
        diffQueue.push({
          parentId: this._rootId,
          parentNode: $(`[data-reactid="${this._rootId}"]`), // dom元素
          type: types.INSERT,
          toIndex: i, // 移动到当前位置i
          markUp: newUnit.getMarkUp(`${this._rootId}.${i}`), // 父亲id+索引值
        });
      }
      // 更新一下 _mountIndex  不管结果如何都需要更新
      newUnit._mountIndex = i;
    }
    // 删除多余的
    for (const oldKey in oldChildrenUnitMap) {
      let oldChild = oldChildrenUnitMap[oldKey];
      if (!newChildrenUnitMap.hasOwnProperty(oldKey)) {
        diffQueue.push({
          parentId: this._rootId,
          parentNode: $(`[data-reactid="${this._rootId}"]`), // dom元素
          type: types.REMOVE,
          fromIndex: oldChild._mountIndex, // 移动到当前位置i
        });
      }
    }
  }
  getNewChildren (oldChildrenUnitMap, newChildrenElement) {
    let newChildrenUnits = [];
    let newChildrenUnitMap = {};
    newChildrenElement.forEach((newElement, index) => {
      // 一定要给可以 尽量不要他走内部的索引key
      let newKey =
        (newElement.currentElement &&
          newElement.currentElement.props &&
          newElement.currentElement.props.key) ||
        index.toString();
      let oldUnit = oldChildrenUnitMap[newKey]; //找到老的unit
      let oldElement = oldUnit && oldUnit.currentElement; // 获取老元素
      // dom diff
      if (shouldDeepCompare(oldElement, newElement)) {
        // 一样 可以复用
        // 递归update
        oldUnit.update(newElement);
        // 更新之哦户是最新的 可以复用了
        // 放入数组
        newChildrenUnits.push(oldUnit);
        newChildrenUnitMap[newKey] = oldUnit;
      } else {
        // 不可复用就创建新的unit
        let nextUnit = createReactUnit(newElement);
        newChildrenUnits.push(nextUnit);
        newChildrenUnitMap[newKey] = nextUnit;
      }
    });
    return { newChildrenUnits, newChildrenUnitMap };
  }
  // old children array
  getOldChildrenMap (childrenUnits = []) {
    let map = {};
    for (let i = 0; i < childrenUnits.length; i++) {
      // 取出key || index作为key
      let key =
        (childrenUnits[i].currentElement.props &&
          childrenUnits[i].currentElement.props.key) ||
        i.toString();
      map[key] = childrenUnits[i];
    }
    return map;
  }
}
// 负责渲染react组件;
class ReactCompositeUnit extends Unit {
  /*
  _componentInstance 当前的组件实例
  _renderedUnitInstance 当前组件render方法返回的react元素对应的unit currentElement指向react元素
  */
  getMarkUp (rootId) {
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
  update (nextElement, partialState) {
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
      // 如果可以进行深比较 则把更新的工作交给上次渲染出来的那个element元素对应的unit来处理
      // preRenderUnitInstance  render的实例
      preRenderUnitInstance.update(nextRenderElement);
      // Counter
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
function shouldDeepCompare (oldElement, newElement) {
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
function createReactUnit (element) {
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
