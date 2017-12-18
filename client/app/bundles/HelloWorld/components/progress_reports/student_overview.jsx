import React from 'react'
import request from 'request'
import {CSVDownload, CSVLink} from 'react-csv'
import getParameterByName from '../modules/get_parameter_by_name'
import StudentOveriewTable from './student_overview_table.jsx'

export default class extends React.Component {

	constructor(){
		super()
    this.state = {
      loading: true,
      errors: false,
    }
		this.calculateCountAndAverage = this.calculateCountAndAverage.bind(this)
	}

  componentDidMount(){
    const that = this;
		const classroomId = getParameterByName('classroom_id', window.location.href)
		const studentId = getParameterByName('student_id', window.location.href)
    request.get({
      url: `${process.env.DEFAULT_URL}/api/v1/progress_reports/student_overview_data/${studentId}/${classroomId}`,
    },
    (e, r, body) => {
      const data = JSON.parse(body)
      that.setState({loading: false, errors: body.errors, studentData: data.student_data, reportData: data.report_data, classroomName: data.classroom_name});
    });
  }

	grayAndYellowStat(grayContent,yellowContent){
		return (<td>
			<div className='gray-text'>{grayContent}</div>
			<div className='yellow-text'>{yellowContent}</div>
		</td>)
	}

	calculateCountAndAverage(){
		let count = 0;
		let cumulativeScore = 0;
		this.state.reportData.forEach((row) => {
			if (row.percentage) {
				count += 1;
				cumulativeScore += parseFloat(row.percentage);
			}
		})
		let average = Math.round((cumulativeScore / count) * 100) + '%'
		return {count, average}
	}

	studentOverviewSection(){
		let countAndAverage
		if (this.state.reportData) {
			countAndAverage = this.calculateCountAndAverage()
		}
		return (
		 <table className='overview-header-table'>
			 <tbody>
				 <tr className='top'>
					 <td className='student-name'>
						 {this.state.studentData.name}
					 </td>
					 {this.grayAndYellowStat('Class', this.state.classroomName)}
					 <td className='csv-link'><CSVLink data={this.state.reportData} target="_blank"><button className='btn button-green'>Download Report</button></CSVLink></td>
				 </tr>
				 <tr className='bottom'>
					 {this.grayAndYellowStat('Overall Score:', countAndAverage.average || '--')}
					 {this.grayAndYellowStat('Activities Completed:', countAndAverage.count || '--')}
					 {this.grayAndYellowStat()}
				 </tr>
			 </tbody>
		</table>)
	}

	render() {
    let errors
    if (this.state.errors) {
      errors = <div className='errors'>{this.state.errors}</div>
    }
    if (this.state.loading) {
      return <div>LOADING</div>
    }
    return (
    <div id='student-overview'>
			<a href="/" className='navigate-back'><img src="https://assets.quill.org/images/icons/chevron-dark-green.svg" alt=""/>Back to Activity Scores</a>
			{this.studentOverviewSection()}
			<StudentOveriewTable reportData={this.state.reportData} studentId={this.state.studentData.id} calculateCountAndAverage={this.calculateCountAndAverage}/>
    </div>
  	)}

}