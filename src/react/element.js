export class Element {
  constructor(type, props) {
    this.type = type;
    this.props = props;
  }
}
function createElement(type, props, ...children) {
  props = props || {};
  props.children = children;
  return new Element(type, props);
  // return {
  //   type,
  //   props,
  // };
}

// 返回虚拟DOM  用对象来描述元素
export default createElement;
/**
 * <div name="xxx">say</div>
 * {
 * type:'div',
 * props:{
 * name:'xxx',
 * children:['say',props:{children:['nihao']}]}
 * }
 */
