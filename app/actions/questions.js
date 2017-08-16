const C = require('../constants').default;

import rootRef from '../libs/firebase';

const	questionsRef = rootRef.child('questions');
const	responsesRef = rootRef.child('responses');
const moment = require('moment');

import Pusher from 'pusher-js';
import request from 'request';
import _ from 'underscore';
import { push } from 'react-router-redux';
import pathwaysActions from './pathways';
import { submitResponse } from './responses';

// called when the app starts. this means we immediately download all questions, and
// then receive all questions again as soon as anyone changes anything.
function startListeningToQuestions() {
  return (dispatch, getState) => {
    questionsRef.on('value', (snapshot) => {
      dispatch({ type: C.RECEIVE_QUESTIONS_DATA, data: snapshot.val(), });
    });
  };
}

function loadQuestions() {
  return (dispatch, getState) => {
    questionsRef.once('value', (snapshot) => {
      dispatch({ type: C.RECEIVE_QUESTIONS_DATA, data: snapshot.val(), });
    });
  };
}

function startQuestionEdit(qid) {
  return { type: C.START_QUESTION_EDIT, qid, };
}

function cancelQuestionEdit(qid) {
  return { type: C.FINISH_QUESTION_EDIT, qid, };
}

function submitQuestionEdit(qid, content) {
  return (dispatch, getState) => {
    dispatch({ type: C.SUBMIT_QUESTION_EDIT, qid, });
    questionsRef.child(qid).update(content, (error) => {
      dispatch({ type: C.FINISH_QUESTION_EDIT, qid, });
      if (error) {
        dispatch({ type: C.DISPLAY_ERROR, error: `Update failed! ${error}`, });
      } else {
        dispatch({ type: C.DISPLAY_MESSAGE, message: 'Update successfully saved!', });
      }
    });
  };
}
function toggleNewQuestionModal() {
  return { type: C.TOGGLE_NEW_QUESTION_MODAL, };
}
function submitNewQuestion(content, response) {
  return (dispatch, getState) => {
    dispatch({ type: C.AWAIT_NEW_QUESTION_RESPONSE, });
    const newRef = questionsRef.push(content, (error) => {
      dispatch({ type: C.RECEIVE_NEW_QUESTION_RESPONSE, });
      if (error) {
        dispatch({ type: C.DISPLAY_ERROR, error: `Submission failed! ${error}`, });
      } else {
        response.questionUID = newRef.key;
        response.gradeIndex = `human${newRef.key}`;
        dispatch(submitResponse(response));
        dispatch({ type: C.DISPLAY_MESSAGE, message: 'Submission successfully saved!', });
        const action = push(`/admin/questions/${newRef.key}`);
        dispatch(action);
      }
    });
  };
}

function submitNewFocusPoint(qid, data) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/focusPoints`).push(data, (error) => {
      if (error) {
        alert(`Submission failed! ${error}`);
      }
    });
  };
}

function submitEditedFocusPoint(qid, data, fpid) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/focusPoints/${fpid}`).update(data, (error) => {
      if (error) {
        alert(`Submission failed! ${error}`);
      }
    });
  };
}

function submitBatchEditedFocusPoint(qid, data) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/focusPoints/`).set(data, (error) => {
      if (error) {
        alert(`Submission failed! ${error}`);
      }
    });
  };
}

function deleteFocusPoint(qid, fpid) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/focusPoints/${fpid}`).remove((error) => {
      if (error) {
        alert(`Delete failed! ${error}`);
      }
    });
  };
}

function submitNewIncorrectSequence(qid, data) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/incorrectSequences`).push(data, (error) => {
      if (error) {
        alert(`Submission failed! ${error}`);
      }
    });
  };
}

function submitEditedIncorrectSequence(qid, data, seqid) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/incorrectSequences/${seqid}`).update(data, (error) => {
      if (error) {
        alert(`Submission failed! ${error}`);
      }
    });
  };
}

function deleteIncorrectSequence(qid, seqid) {
  return (dispatch, getState) => {
    questionsRef.child(`${qid}/incorrectSequences/${seqid}`).remove((error) => {
      if (error) {
        alert(`Delete failed! ${error}`);
      }
    });
  };
}

function getFormattedSearchData(state) {
  const searchData = state.filters.formattedFilterData;
  searchData.text = state.filters.stringFilter;
  searchData.pageNumber = state.filters.responsePageNumber;
  return searchData;
}

function searchResponses(qid) {
  return (dispatch, getState) => {
    request(
      {
        url: `${process.env.QUILL_CMS}/questions/${qid}/responses/search`,
        method: 'POST',
        json: { search: getFormattedSearchData(getState()), },
      },
      (err, httpResponse, data) => {
        const embeddedOrder = _.map(data.results, (response, i) => {
          response.sortOrder = i;
          return response;
        });
        const parsedResponses = _.indexBy(embeddedOrder, 'id');
        const responseData = {
          responses: parsedResponses,
          numberOfResponses: data.numberOfResults,
          numberOfPages: data.numberOfPages,
        };
        dispatch(updateResponses(responseData));
      }
    );
  };
}

function initializeSubscription(qid) {
  return (dispatch) => {
    if (process.env.NODE_ENV === 'development') {
      Pusher.logToConsole = true;
    }
    if (!window.pusher) {
      window.pusher = new Pusher(process.env.PUSHER_KEY, { encrypted: true, });
    }
    const channel = window.pusher.subscribe(`admin-${qid}`);
    channel.bind('new-response', (data) => {
      setTimeout(() => dispatch(searchResponses(qid)), 1000);
    });
  };
}

function removeSubscription(qid) {
  return (dispatch) => {
    if (window.pusher) {
      window.pusher.unsubscribe(`admin-${qid}`);
    }
  };
}

function updatePageNumber(pageNumber, qid) {
  return (dispatch) => {
    dispatch(setPageNumber(pageNumber));
    dispatch(searchResponses(qid));
  };
}

function updateStringFilter(stringFilter, qid) {
  return (dispatch) => {
    dispatch(setStringFilter(stringFilter));
    dispatch(searchResponses(qid));
  };
}

function startResponseEdit(qid, rid) {
  return { type: C.START_RESPONSE_EDIT, qid, rid, };
}

function cancelResponseEdit(qid, rid) {
  return { type: C.FINISH_RESPONSE_EDIT, qid, rid, };
}

function startChildResponseView(qid, rid) {
  return { type: C.START_CHILD_RESPONSE_VIEW, qid, rid, };
}

function cancelChildResponseView(qid, rid) {
  return { type: C.CANCEL_CHILD_RESPONSE_VIEW, qid, rid, };
}

function startFromResponseView(qid, rid) {
  return { type: C.START_FROM_RESPONSE_VIEW, qid, rid, };
}

function cancelFromResponseView(qid, rid) {
  return { type: C.CANCEL_FROM_RESPONSE_VIEW, qid, rid, };
}

function startToResponseView(qid, rid) {
  return { type: C.START_TO_RESPONSE_VIEW, qid, rid, };
}

function cancelToResponseView(qid, rid) {
  return { type: C.CANCEL_TO_RESPONSE_VIEW, qid, rid, };
}

function clearQuestionState(qid) {
  return { type: C.CLEAR_QUESTION_STATE, qid, };
}

function updateResponses(data) {
  return { type: C.UPDATE_SEARCHED_RESPONSES, data, };
}

function setPageNumber(pageNumber) {
  return { type: C.SET_RESPONSE_PAGE_NUMBER, pageNumber, };
}

function setStringFilter(stringFilter) {
  return { type: C.SET_RESPONSE_STRING_FILTER, stringFilter, };
}

module.exports = {
  startListeningToQuestions,
  loadQuestions,
  startQuestionEdit,
  cancelQuestionEdit,
  submitQuestionEdit,
  toggleNewQuestionModal,
  submitNewQuestion,
  submitNewFocusPoint,
  submitEditedFocusPoint,
  submitBatchEditedFocusPoint,
  deleteFocusPoint,
  submitNewIncorrectSequence,
  submitEditedIncorrectSequence,
  deleteIncorrectSequence,
  searchResponses,
  initializeSubscription,
  removeSubscription,
  updatePageNumber,
  updateStringFilter,
  startResponseEdit,
  cancelResponseEdit,
  startChildResponseView,
  cancelChildResponseView,
  startFromResponseView,
  cancelFromResponseView,
  startToResponseView,
  cancelToResponseView,
  clearQuestionState,
  updateResponses,
  setPageNumber,
  setStringFilter,
};
