import React, { Component } from 'react';
import { connect } from 'react-redux';

import SentenceFragmentTemplate from '../sentenceFragments/sentenceFragmentTemplateComponent.jsx';

class PlaySentenceFragment extends Component {
  constructor(props) {
    super();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.question !== this.props.question) {
      return true;
    }
    return false;
  }

  render() {
    return (
      <SentenceFragmentTemplate {...this.props} handleAttemptSubmission={() => {}} />
    );
  }

}

export default PlaySentenceFragment;
