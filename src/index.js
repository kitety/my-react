// react render方法

import React from "./react";

function say() {
  alert(1);
}
class SubCounter {
  componentWillMount() {
    console.log("child组件将挂载");
  }
  componentDidMount() {
    console.log("child组件已经挂载");
  }
  render() {
    return 13213;
  }
}

class Counter extends React.Component {
  constructor(props) {
    // 传给父类
    super(props);
    this.state = { number: 1 };
  }
  // 先父亲 再儿子
  componentWillMount() {
    console.log("parent组件将挂载");
  }
  componentDidMount() {
    console.log("parent组件已经挂载");
  }
  render() {
    return React.createElement(SubCounter, { name: 111 });
  }
}
let classEle = React.createElement(Counter, {
  name: "hello",
});
console.log(classEle);

let element = React.createElement(
  "div",
  null,
  "hello ",
  /*#__PURE__*/ React.createElement("button", { onClick: say }, "3423432")
);
console.log("====================================");
console.log(element);
console.log("====================================");
//  (
//   <div>
//     hello <span>3423432</span>
//   </div>
// ); // React.createElement("div", null, "hello ", /*#__PURE__*/React.createElement("span", null, "3423432"));
// jsx语法 转换为虚拟Dom 对象  类  函数
React.render(classEle, document.getElementById("root"));
/**
 *
 *
 * <Counter name="hello" />
React.createElement(Counter, {
  name: "hello"
});
 */
