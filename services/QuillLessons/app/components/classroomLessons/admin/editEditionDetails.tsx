import React, {Component} from 'react'
import _ from 'lodash'

export default class EditLessonDetails extends Component<any, any> {
  constructor(props){
    super(props);

    this.state = {
      edition: this.props.edition
    }

    this.handleEditionDetailsChange = this.handleEditionDetailsChange.bind(this)
  }

  // componentWillReceiveProps(nextProps) {
  //   if (!_.isEqual(nextProps.edition, this.state.edition)) {
  //     this.setState({edition: nextProps.edition})
  //   }
  // }
  //
  handleEditionDetailsChange(e, key) {
    const newLesson = _.merge({}, this.state.edition)
    newLesson[key] = e.target.value
    this.setState({edition: newLesson})
  }

  handleFlagChange(e) {
    const newLesson = _.merge({}, this.state.edition)
    newLesson.flags = [e.target.value]
    this.setState({edition: newLesson})
  }

  render() {
    return <div style={{marginTop: 30, marginBottom: 30}}>
      <div className="field">
        <label className="label">Edition Name</label>
        <div className="control">
        <input value={this.state.edition.name} onChange={(e) => this.handleEditionDetailsChange(e, 'name')} className="input" type="text" placeholder="Edition Name"/>
        </div>
      </div>
      <div className="field">
        <label className="label">Sample Question</label>
        <div className="control">
        <input value={this.state.edition.sample_question} onChange={(e) => this.handleEditionDetailsChange(e, 'sample_question')} className="input" type="text" placeholder="Sample Question"/>
        </div>
      </div>
      <div className="field">
        <label className="label">Flag</label>
        <div className="control">
        <select value={this.state.edition.flags ? this.state.edition.flags[0] : 'production'} onChange={(e) => this.handleFlagChange(e)}>
          <option value='archived'>Archived</option>
          <option value='production'>Production</option>
          <option value='alpha'>Alpha</option>
        </select>
        </div>
      </div>
      <div className="control is-grouped" style={{marginTop: 10}}>
        <p className="control">
          <button className="button is-primary" onClick={() => this.props.save(this.state.edition)}>Save Changes</button>
        </p>
        <p className="control">
          <button className="button is-danger" onClick={this.props.deleteEdition}>Delete Edition</button>
        </p>
      </div>
    </div>
  }
}