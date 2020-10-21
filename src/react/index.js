import $ from "jquery";

let React = {
  render,
  nextRootIndex: 0,
};
// 给每个元素添加属性 方便能获取
function render(element, container) {
  // 包一层添加属性
  let markup = `<span data-reactid="${React.nextRootIndex}">${element}</span>`;
  $(container).html(markup);
}

export default React;
