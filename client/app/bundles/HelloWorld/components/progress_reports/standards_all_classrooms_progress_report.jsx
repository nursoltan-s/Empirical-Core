import React from 'react'
import request from 'request'
import {CSVDownload, CSVLink} from 'react-csv'
import CSVDownloadForProgressReport from './csv_download_for_progress_report.jsx'
import ReactTable from 'react-table'
import 'react-table/react-table.css'
import ClassroomDropdown from '../general_components/dropdown_selectors/classroom_dropdown'
import LoadingSpinner from '../shared/loading_indicator.jsx'
import moment from 'moment'

import _ from 'underscore'

const showAllClassroomKey = 'All Classrooms'

export default class extends React.Component {

  constructor() {
    super()
    this.state = {
      loading: true,
      errors: false,
      selectedClassroom: showAllClassroomKey,
      classrooms: []
    }
    this.switchClassrooms = this.switchClassrooms.bind(this)
  }

  componentDidMount() {
    this.getData()
  }

  getData() {
    const that = this;
    let qs
    if (this.state.selectedClassroom !== showAllClassroomKey) {
      const classroom = this.state.classrooms.find(c => c.name === this.state.selectedClassroom)
      qs = classroom ? {classroom_id: classroom.id} : null
    }
    request.get({
      url: `${process.env.DEFAULT_URL}/teachers/progress_reports/standards/classrooms.json`, qs
    }, (e, r, body) => {
      const data = JSON.parse(body).data
      console.log(data)
        const csvData = this.formatDataForCSV(data)
      const standardsData = this.formatStandardsData(data)
      // gets unique classroom names
      const classrooms = JSON.parse(body).classrooms
      const students = JSON.parse(body).students
      classrooms.unshift({name: showAllClassroomKey})
      that.setState({loading: false, errors: body.errors, standardsData, csvData, classrooms, students});
    });
  }

  formatStandardsData(data) {
    return data.map((row) => {
      row.standard_level = <span className='green-text'>{row.name}</span>
      row.standard_name = row.section_name
      row.number_of_students = Number(row.total_student_count)
      row.proficient = `${row.proficient_count} of ${row.total_student_count}`
      row.activities = Number(row.total_activity_count)
      row.green_arrow = (
        <a className='green-arrow' href={`/teachers/progress_reports/student_overview?classroom_id=${row.classroom_id}&student_id=${row.student_id}`}>
          <img src="https://assets.quill.org/images/icons/chevron-dark-green.svg" alt=""/>
        </a>
      )
      return row
    })
  }

  formatDataForCSV(data) {
    const csvData = [
      ['Standard Level', 'Standard Name', 'Students', 'Proficient', 'Activities']
    ]
    data.forEach((row) => {
      csvData.push([
        row['name'], row['section_name'], row['total_student_count'], `${row['proficient_count']} of ${row['total_student_count']}`, row['total_activity_count']
      ])
    })
    return csvData
  }

  columns() {
    return ([
      {
        Header: 'Standard Level',
        accessor: 'standard_level',
        resizable: false,
        // sortMethod: this.sortByLastName,
      }, {
        Header: "Standard Name",
        accessor: 'standard_name',
        resizable: false
      }, {
        Header: "Students",
        accessor: 'number_of_students',
        resizable: false,
        // sortMethod: (a, b) => {
        //   return Number(a.substr(0, a.indexOf('%'))) > Number(b.substr(0, b.indexOf('%')))
        //     ? 1
        //     : -1;
        }, {
				Header: "Proficient",
				accessor: 'proficient',
				resizable: false,
				// sortMethod: (a,b) => {
				// 	const aEpoch = a ? moment(a).unix() : 0;
				// 	const bEpoch = b ? moment(b).unix() : 0;
				// 	return aEpoch > bEpoch ? 1 : -1;
				}, {
				Header: "Activities",
				accessor: 'activities',
				resizable: false,
				// sortMethod: (a,b) => {
				// 	const aEpoch = a ? moment(a).unix() : 0;
				// 	const bEpoch = b ? moment(b).unix() : 0;
				// 	return aEpoch > bEpoch ? 1 : -1;
				}, {
        Header: "",
        accessor: 'green_arrow',
        resizable: false,
        sortable: false,
        className: 'hi',
        width: 80,
        Cell: props => props.value
      }
    ])
  }

  switchClassrooms(classroom) {
    this.setState({selectedClassroom: classroom}, () => this.getData())
  }

  filteredData() {
    return this.state.standardsData
  }

  render() {
    let errors
    if (this.state.errors) {
      errors = <div className='errors'>{this.state.errors}</div>
    }
    if (this.state.loading) {
      return <LoadingSpinner/>
    }
    const filteredData = this.filteredData()
    return (
      <div className='activities-scores-by-classroom progress-reports-2018'>
        <div className="meta-overview flex-row space-between">
          <div className='header-and-info'>
            <h1>Standards Report</h1>
            <p>Filter by classroom and student to see student mastery on the Common Core standards. You can export the data by downloading a CSV report.</p>
          </div>
          <div className='csv-and-how-we-grade'>
            <CSVDownloadForProgressReport data={this.state.csvData}/>
            <a className='how-we-grade' href="https://support.quill.org/activities-implementation/how-does-grading-work">How We Grade<i className="fa fa-long-arrow-right"></i></a>
          </div>
        </div>
        <div className='dropdown-container'>
          <ClassroomDropdown classrooms={this.state.classrooms.map(c => c.name)} callback={this.switchClassrooms} selectedClassroom={this.state.selectedClassroom}/>
        </div>
				<div key={`${filteredData.length}-length-for-activities-scores-by-classroom`}>
					<ReactTable data={filteredData}
						columns={this.columns()}
						showPagination={false}
						defaultSorted={[{id: 'standard_level', desc: true}]}
					  showPaginationTop={false}
						showPaginationBottom={false}
						 showPageSizeOptions={false}
							defaultPageSize={filteredData.length}
						 className='progress-report has-green-arrow'/></div>
      </div>
    )
  }

}
