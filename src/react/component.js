class Component {
  constructor(props) {
    this.props = props;
  }
  setState(partialState) {
    console.log(this)
    /**
     * 参数1 新的元素
     * 参数2 新的状态
     */
    this._currentUnit.update(null, partialState);
  }
}
export default Component;
