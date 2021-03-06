require 'rails_helper'

describe ClassroomUnit, type: :model, redis: :true do

  it { should belong_to(:classroom) }
  it { should belong_to(:unit) }
  it { should have_many(:activity_sessions) }
  it { should have_many(:classroom_unit_activity_states) }

  it { is_expected.to callback(:check_for_assign_on_join_and_update_students_array_if_true).before(:save) }
  it { is_expected.to callback(:hide_appropriate_activity_sessions).after(:save) }

  let!(:activity) { create(:activity) }
  let!(:student) { create(:user, role: 'student', username: 'great', name: 'hi hi', password: 'pwd') }
  let!(:student2) { create(:user, role: 'student', username: 'good', name: 'bye bye', password: 'pwd') }
  let!(:classroom) { create(:classroom, students: [student]) }
  let!(:classroom_2) { create(:classroom) }
  let!(:teacher) {classroom.owner}
  let!(:unit) { create(:unit) }
  let!(:unit_2) { create(:unit) }
  let!(:unit_3) { create(:unit) }
  let!(:classroom_unit) { create(:classroom_unit, classroom: classroom, unit: unit, assigned_student_ids: [student.id]) }
  let!(:activity_session) {create(:activity_session, classroom_unit_id: classroom_unit.id, user_id: student.id, state: 'unstarted')}

  describe '#assigned_students' do
    let(:classroom_unit_with_no_assigned_students) { create(:classroom_unit, unit: unit_2, classroom: classroom_2, assigned_student_ids: []) }
    it 'must be empty if none assigned' do
      expect(classroom_unit_with_no_assigned_students.assigned_students).to be_empty
    end

    context 'when there is an assigned student' do
      let(:classroom) { create(:classroom, code: '101') }
        before do
          @student = classroom.students.build(first_name: 'John', last_name: 'Doe')
          @student.generate_student(classroom.id)
          @student.save!
          @new_classroom_unit = create(:classroom_unit, classroom: classroom, assigned_student_ids: [@student.id])
        end

        it 'must return a list with one element' do
          expect(@new_classroom_unit.assigned_students.first).to eq(@student)
        end
    end
  end

  describe '#is_valid_for_google_announcement_with_specific_user?' do
    it "returns true if the classroom_unit's classroom has a google_classroom_id and the passed user has a google_id" do
      classroom_unit.classroom.update(google_classroom_id: '3')
      teacher.update(google_id: 10)
      expect(classroom_unit.reload.is_valid_for_google_announcement_with_specific_user?(teacher)).to be
    end
    it "returns false if the classroom_unit's classroom does not a google_classroom_id and the passed user has a google_id" do
      classroom_unit.classroom.update(google_classroom_id: nil)
      teacher.update(google_id: 10)
      expect(classroom_unit.reload.is_valid_for_google_announcement_with_specific_user?(teacher)).not_to be
    end
    it "returns false if the classroom_unit's classroom has a google_classroom_id and the user does not have a google_id" do
      classroom_unit.classroom.update(google_classroom_id: 4)
      teacher.update(google_id: nil)
      expect(classroom_unit.reload.is_valid_for_google_announcement_with_specific_user?(teacher)).not_to be
    end
    it "returns false if the classroom_unit's classroom does not have a google_classroom_id and the user does not have a google_id" do
      classroom_unit.classroom.update(google_classroom_id: nil)
      teacher.update(google_id: nil)
      expect(classroom_unit.reload.is_valid_for_google_announcement_with_specific_user?(teacher)).not_to be
    end
  end

  describe '#teacher_and_classroom_name' do
    it "returns a hash with the name of the owner and the classroom" do
      expect(classroom_unit.teacher_and_classroom_name).to eq({teacher: teacher.name, classroom: classroom.name})
    end
  end

  describe '#validate_assigned_student' do

    context 'it must return true when' do

      it 'assign_on_join is true' do
        classroom_unit.assign_on_join = true
        expect(classroom_unit.validate_assigned_student(student.id)).to be true
      end

      it 'assigned_student_ids contains the student id' do
        classroom_unit.assigned_student_ids = [student.id]
        expect(classroom_unit.validate_assigned_student(student.id)).to be true
      end

    end

    it 'must return false when assigned_student_ids does not contain the student id and it was not assigned to the entire classroom' do
      classroom_unit.update(assigned_student_ids: [student.id + 10], assign_on_join: false)
      expect(classroom_unit.validate_assigned_student(student.id)).to be false
    end
  end

  describe 'validates non-duplicate' do
    it 'will not save a classroom unit with the same unit and classroom as another classroom unit' do
      expect(ClassroomUnit.new(classroom: classroom_unit.classroom, unit: classroom_unit.unit)).to_not be_valid
    end

    it 'will allow a classroom unit with the same classroom but different unit' do
      new_ca = create(:classroom_unit, classroom: classroom)
      expect(new_ca.persisted?).to be true
    end
  end

  describe '#check_for_assign_on_join_and_update_students_array_if_true callback' do
    context 'when assign_on_join is false' do
      let(:classroom_with_two_students) { create(:classroom, students: [student, student2])}
      let(:other_classroom_unit) { create(:classroom_unit, unit: unit_3, classroom: classroom_with_two_students, assigned_student_ids: []) }
      describe 'when the assigned students contain all the students in the classroom' do
        it "sets the classroom unit to assign_on_join: true" do
          expect(other_classroom_unit.assign_on_join).not_to eq(true)
          other_classroom_unit.update!(assigned_student_ids: [student.id, student2.id])
          expect(other_classroom_unit.reload.assign_on_join).to eq(true)
        end
      end

      describe 'when the assigned students do not contain all the students in the classroom' do
        it "does not set the classroom unit to assign_on_join: true" do
          other_classroom_unit.update!(assign_on_join: false)
          other_classroom_unit.update!(assigned_student_ids: [])
          expect(other_classroom_unit.reload.assign_on_join).not_to eq(true)
        end
      end
    end

    context 'when assign_on_join is true' do
      it "updates the assigned student ids with all students in the classroom" do
          empty_classroom_unit = create(:classroom_unit, classroom: classroom, assign_on_join: true, assigned_student_ids: [])
          expect(empty_classroom_unit.reload.assigned_student_ids).to eq([student.id])
      end
    end
  end

end
