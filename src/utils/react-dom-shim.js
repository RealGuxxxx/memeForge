// 这个文件为不兼容的包提供 findDOMNode 兼容层
import * as ReactDOM from 'react-dom';

// 为 ReactDOM 添加缺失的 findDOMNode 方法
if (!ReactDOM.findDOMNode) {
  ReactDOM.findDOMNode = (component) => {
    console.warn(
      '警告: findDOMNode 已在 React 18 中废弃。应用程序使用了过时的 API。' +
      '请考虑更新依赖或使用 React.forwardRef 和 Refs。'
    );
    
    // 针对 React 18，我们无法真正实现 findDOMNode 的功能
    // 这只是一个存根实现，可能无法适用于所有场景
    return null;
  };
}

export default ReactDOM; 