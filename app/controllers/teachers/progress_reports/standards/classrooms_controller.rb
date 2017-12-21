class Teachers::ProgressReports::Standards::ClassroomsController < Teachers::ProgressReportsController
  def index
    respond_to do |format|
      format.html do
        AccessProgressReportWorker.perform_async(current_user.id)
      end

      format.json do
        classroom_id = params[:classroom_id]
        student_id = nil
        data = ::ProgressReports::Standards::AllClassroomsTopic.new(current_user).results(classroom_id, student_id)
        render json: {
          data: data,
          teacher: UserWithEmailSerializer.new(current_user).as_json(root: false),
          classrooms: current_user.classrooms_i_teach,
          students: student_names_and_ids
        }
      end
    end
  end
end

private

def student_names_and_ids
  ActiveRecord::Base.connection.execute("SELECT students.name, students.id FROM users AS teacher
  JOIN classrooms_teachers AS ct ON ct.user_id = teacher.id
  JOIN classrooms ON classrooms.id = ct.classroom_id AND classrooms.visible = TRUE
  JOIN students_classrooms AS sc ON sc.classroom_id = ct.classroom_id
  JOIN users AS students ON students.id = sc.student_id
  WHERE teacher.id = #{current_user.id}
  ORDER BY substring(students.name, '([^[:space:]]+)(?:,|$)')").to_a
end
