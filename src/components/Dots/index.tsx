import React from 'react';

import '../../poly';
import { Mark } from './types';
import { graph, Graph, GraphInputs } from './graph';

import styles from './styles.scss';

interface Props extends GraphInputs {
  dotLabel: string;
  marks: Mark[];
}

export default class Dots extends React.Component {
  props: Props;
  rootRef: any;
  graph?: Graph;

  constructor(props) {
    super(props);
    this.props = props;
    this.rootRef = React.createRef();
  }

  componentWillReceiveProps(nextProps) {
    this.graph?.update(nextProps);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    if (!this.rootRef.current) {
      return;
    }
    this.graph = graph(this.rootRef.current, {});
    this.graph.update(this.props);
  }

  render() {
    return (
      <div className={styles.dots} ref={this.rootRef}>
        {this.props.dotLabel && <div className={styles.dotLabel}>{`= ${this.props.dotLabel}`}</div>}
      </div>
    );
  }
}
