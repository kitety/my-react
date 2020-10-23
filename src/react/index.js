import $ from "jquery";
import createReactUnit from "./unit.js";
import createElement from "./element.js";
import Component from "./component.js";

let React = {
  render,
  createElement,
  nextRootIndex: 0,
  Component,
};
// 给每个元素添加属性 方便能获取
function render(element, container) {
  // 写一个工厂函数来创建对应的React元素，返回文本 元素
  // 都是通过工厂函数创建
  let createReactUnitInstance = createReactUnit(element); // 实例
  let markup = createReactUnitInstance.getMarkUp(React.nextRootIndex); //markup
  // 包一层添加属性
  // let markup = `<span data-reactid="${React.nextRootIndex}">${element}</span>`;
  $(container).html(markup);
  // 触发组件创建完成 这个时候触发componentDidMount 挂载完成
  $(document).trigger("mounted"); // 所有组件挂载ok
}

export default React;
