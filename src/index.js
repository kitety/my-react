// react render方法

import React from "./react";

let element = React.createElement(
  "div",
  null,
  "hello ",
  /*#__PURE__*/ React.createElement("button", null, "3423432")
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
React.render(element, document.getElementById("root"));
