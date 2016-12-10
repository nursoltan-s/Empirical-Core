import _ from 'underscore';
import fuzzy from 'fuzzyset.js';
import constants from '../constants';
import { checkForMissingWords } from './requiredWords';
import {
  checkChangeObjectMatch
} from './algorithms/changeObjects';
import { getOptimalResponses, getTopOptimalResponse } from './sharedResponseFunctions';

const jsDiff = require('diff');

const ERROR_TYPES = {
  NO_ERROR: 'NO_ERROR',
  MISSING_WORD: 'MISSING_WORD',
  ADDITIONAL_WORD: 'ADDITIONAL_WORD',
  INCORRECT_WORD: 'INCORRECT_WORD',
};

String.prototype.normalize = function () {
  return this.replace(/[\u201C\u201D]/g, '\u0022').replace(/[\u00B4\u0060\u2018\u2019]/g, '\u0027').replace('‚', ',');
};

const conceptResultTemplate = (conceptUID, correct = false) => ({
  conceptUID,
  correct,
});

export function removePunctuation(string) {
  return string.replace(/[^A-Za-z0-9\s]/g, '');
}

const downcasedFocusPoints = (focusPointsArr=[]) => focusPointsArr.map((fp) => {
  fp.text = fp.text.toLowerCase();
  return fp;
});

const removeSpaces = string => string.replace(/\s+/g, '');

// Check number of chars added.

const getLowAdditionCount = (newString, oldString) => {
  const diff = jsDiff.diffChars(newString, oldString);
  const additions = _.where(diff, { added: true, });
  if (additions.length > 1) {
    return false;
  }
  const count = _.reduce(additions, (memo, num) => memo + num.count, 0);
  if (count < 3) {
    return true;
  }
  return false;
};

export default class Question {
  constructor(data) {
    this.prompt = data.prompt;
    this.sentences = data.sentences;
    this.responses = data.responses;
    this.questionUID = data.questionUID;
    this.focusPoints = downcasedFocusPoints(data.focusPoints) || [];
  }

  checkMatch(response) {
    // Remove leading and trailing whitespace, then make sure all words are single spaced
    const formattedResponse = response.trim().replace(/\s{2,}/g, ' ');
    const returnValue = {
      found: true,
      submitted: formattedResponse,
      response: {
        text: formattedResponse,
        questionUID: this.questionUID,
        count: 1,
      },
    };

    const res = returnValue.response;
    const exactMatch = this.checkExactMatch(response);
    if (exactMatch !== undefined) {
      returnValue.response = exactMatch;
      return returnValue;
    }
    const focusPointMatch = this.checkFocusPointMatch(response);
    if (focusPointMatch !== undefined) {
      res.feedback = focusPointMatch.feedback;
      res.author = 'Focus Point Hint';
      res.parentID = getTopOptimalResponse(this.responses).key;
      if (focusPointMatch.conceptUID) {
        res.conceptResults = [
          conceptResultTemplate(focusPointMatch.conceptUID)
        ];
      }
      return returnValue;
    }
    const lowerCaseMatch = this.checkCaseInsensitiveMatch(response);
    if (lowerCaseMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.caseError;
      res.author = 'Capitalization Hint';
      res.parentID = lowerCaseMatch.key;
      res.conceptResults = [
        conceptResultTemplate('66upe3S5uvqxuHoHOt4PcQ')
      ];
      return returnValue;
    }
    const punctuationMatch = this.checkPunctuationInsensitiveMatch(response);
    if (punctuationMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.punctuationError;
      res.author = 'Punctuation Hint';
      res.parentID = punctuationMatch.key;
      res.conceptResults = [
        conceptResultTemplate('mdFUuuNR7N352bbMw4Mj9Q')
      ];
      return returnValue;
    }
    const punctuationAndCaseMatch = this.checkPunctuationAndCaseInsensitiveMatch(response);
    if (punctuationAndCaseMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.punctuationAndCaseError;
      res.author = 'Punctuation and Case Hint';
      res.parentID = punctuationAndCaseMatch.key;
      res.conceptResults = [
        conceptResultTemplate('66upe3S5uvqxuHoHOt4PcQ'),
        conceptResultTemplate('mdFUuuNR7N352bbMw4Mj9Q')
      ];
      return returnValue;
    }
    const changeObjectMatch = this.checkChangeObjectRigidMatch(response);
    if (changeObjectMatch !== undefined) {
      switch (changeObjectMatch.errorType) {
        case ERROR_TYPES.INCORRECT_WORD:
          res.feedback = constants.FEEDBACK_STRINGS.modifiedWordError;
          res.author = 'Modified Word Hint';
          res.parentID = changeObjectMatch.response.key;
          res.conceptResults = [
            conceptResultTemplate('H-2lrblngQAQ8_s-ctye4g')
          ];
          return returnValue;
        case ERROR_TYPES.ADDITIONAL_WORD:
          res.feedback = constants.FEEDBACK_STRINGS.additionalWordError;
          res.author = 'Additional Word Hint';
          res.parentID = changeObjectMatch.response.key;
          res.conceptResults = [
            conceptResultTemplate('QYHg1tpDghy5AHWpsIodAg')
          ];
          return returnValue;
        case ERROR_TYPES.MISSING_WORD:

          res.feedback = constants.FEEDBACK_STRINGS.missingWordError;
          res.author = 'Missing Word Hint';
          res.parentID = changeObjectMatch.response.key;
          res.conceptResults = [
            conceptResultTemplate('N5VXCdTAs91gP46gATuvPQ')
          ];
          return returnValue;
        default:
          return;
      }
    }
    const changeObjectFlexMatch = this.checkChangeObjectFlexibleMatch(response);
    if (changeObjectFlexMatch !== undefined) {
      switch (changeObjectFlexMatch.errorType) {
        case ERROR_TYPES.INCORRECT_WORD:

          res.feedback = constants.FEEDBACK_STRINGS.modifiedWordError;
          res.author = 'Flexible Modified Word Hint';
          res.parentID = changeObjectFlexMatch.response.key;
          res.conceptResults = [
            conceptResultTemplate('H-2lrblngQAQ8_s-ctye4g')
          ];
          return returnValue;
        case ERROR_TYPES.ADDITIONAL_WORD:

          res.feedback = constants.FEEDBACK_STRINGS.additionalWordError;
          res.author = 'Flexible Additional Word Hint';
          res.parentID = changeObjectFlexMatch.response.key;
          res.conceptResults = [
            conceptResultTemplate('QYHg1tpDghy5AHWpsIodAg')
          ];
          return returnValue;
        case ERROR_TYPES.MISSING_WORD:

          res.feedback = constants.FEEDBACK_STRINGS.missingWordError;
          res.author = 'Flexible Missing Word Hint';
          res.parentID = changeObjectFlexMatch.response.key;
          res.conceptResults = [
            conceptResultTemplate('N5VXCdTAs91gP46gATuvPQ')
          ];
          return returnValue;
        default:
          return;
      }
    }
    const whitespaceMatch = this.checkWhiteSpaceMatch(response);
    if (whitespaceMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.whitespaceError;
      res.author = 'Whitespace Hint';
      res.parentID = whitespaceMatch.key;
      res.conceptResults = [
        conceptResultTemplate('5Yv4-kNHwwCO2p8HI90oqQ')
      ];
      return returnValue;
    }
    const requiredWordsMatch = this.checkRequiredWordsMatch(response);
    if (requiredWordsMatch !== undefined) {
      res.feedback = requiredWordsMatch.feedback;
      res.author = 'Required Words Hint';
      res.parentID = getTopOptimalResponse(this.responses).key;
      res.conceptResults = [
        conceptResultTemplate('N5VXCdTAs91gP46gATuvPQ')
      ];
      return returnValue;
    }
    const minLengthMatch = this.checkMinLengthMatch(response);
    if (minLengthMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.minLengthError;
      res.author = 'Missing Details Hint';
      res.parentID = minLengthMatch.key;
      res.conceptResults = [
        conceptResultTemplate('N5VXCdTAs91gP46gATuvPQ')
      ];
      return returnValue;
    }
    const maxLengthMatch = this.checkMaxLengthMatch(response);
    if (maxLengthMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.maxLengthError;
      res.author = 'Not Concise Hint';
      res.parentID = maxLengthMatch.key;
      res.conceptResults = [
        conceptResultTemplate('QYHg1tpDghy5AHWpsIodAg')
      ];
      return returnValue;
    }
    const lowerCaseStartMatch = this.checkCaseStartMatch(response);
    if (lowerCaseStartMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.caseError;
      res.author = 'Capitalization Hint';
      res.parentID = lowerCaseStartMatch.key;
      res.conceptResults = [
        conceptResultTemplate('S76ceOpAWR-5m-k47nu6KQ')
      ];
      return returnValue;
    }
    const punctuationEndMatch = this.checkPunctuationEndMatch(response);
    if (punctuationEndMatch !== undefined) {
      res.feedback = constants.FEEDBACK_STRINGS.punctuationError;
      res.author = 'Punctuation End Hint';
      res.parentID = punctuationEndMatch.key;
      res.conceptResults = [
        conceptResultTemplate('JVJhNIHGZLbHF6LYw605XA')
      ];
      return returnValue;
    }
    returnValue.found = false;
    return returnValue;
  }

  nonChildResponses() {
    return _.filter(this.responses,
      resp => resp.parentID === undefined && resp.feedback !== undefined
    );
  }

  checkExactMatch(response) {
    return _.find(this.responses,
      resp => resp.text.normalize() === response.normalize()
    );
  }

  checkCaseInsensitiveMatch(response) {
    return _.find(getOptimalResponses(this.responses),
      resp => resp.text.normalize().toLowerCase() === response.normalize().toLowerCase()
    );
  }

  checkCaseStartMatch(response) {
    if (response[0] && response[0].toLowerCase() === response[0]) {
      return getTopOptimalResponse(this.responses);
    }
  }

  checkPunctuationEndMatch(response) {
    const lastChar = response[response.length - 1];
    if (lastChar && lastChar.match(/[a-z]/i)) {
      return getTopOptimalResponse(this.responses);
    }
  }

  checkPunctuationInsensitiveMatch(response) {
    return _.find(getOptimalResponses(this.responses),
      resp => removePunctuation(resp.text.normalize()) === removePunctuation(response.normalize())
    );
  }

  checkPunctuationAndCaseInsensitiveMatch(response) {
    return _.find(getOptimalResponses(this.responses), (resp) => {
      const supplied = removePunctuation(response.normalize()).toLowerCase();
      const target = removePunctuation(resp.text.normalize()).toLowerCase();
      return supplied === target;
    });
  }

  checkWhiteSpaceMatch(response) {
    return _.find(getOptimalResponses(this.responses),
      resp => removeSpaces(response.normalize()) === removeSpaces(resp.text.normalize())
    );
  }

  checkSmallTypoMatch(response) {
    return _.find(this.nonChildResponses(this.responses),
      resp => getLowAdditionCount(response.normalize(), resp.text.normalize())
    );
  }

  checkChangeObjectRigidMatch(response) {
    const fn = string => string.normalize();
    return checkChangeObjectMatch(response, getOptimalResponses(this.responses), fn);
  }

  checkChangeObjectFlexibleMatch(response) {
    const fn = string => removePunctuation(string.normalize()).toLowerCase();
    return checkChangeObjectMatch(response, getOptimalResponses(this.responses), fn);
  }

  checkFuzzyMatch(response) {
    const set = fuzzy(_.pluck(this.responses, 'text'));
    const matches = set.get(response, []);
    let foundResponse;
    let text;
    if (matches.length > 0) {
      const threshold = (matches[0][1].length - 3) / matches[0][1].length;
      text = (matches[0][0] > threshold) && (response.split(' ').length <= matches[0][1].split(' ').length) ? matches[0][1] : null;
    }
    if (text) {
      foundResponse = _.findWhere(this.responses, { text, });
    }
    return foundResponse;
  }

  checkRequiredWordsMatch(response) {
    return checkForMissingWords(response, getOptimalResponses(this.responses));
  }

  checkMinLengthMatch(response) {
    const optimalResponses = getOptimalResponses(this.responses);
    if (optimalResponses.length < 2) {
      return undefined;
    }
    const lengthsOfResponses = optimalResponses.map(resp => resp.text.normalize().split(' ').length);
    const minLength = _.min(lengthsOfResponses) - 1;
    if (response.split(' ').length < minLength) {
      return _.sortBy(optimalResponses, resp => resp.text.normalize().length)[0];
    }
    return undefined;
  }

  checkMaxLengthMatch(response) {
    const optimalResponses = getOptimalResponses(this.responses);
    if (optimalResponses.length < 2) {
      return undefined;
    }
    const lengthsOfResponses = optimalResponses.map(resp => resp.text.normalize().split(' ').length);
    const maxLength = _.max(lengthsOfResponses) + 1;
    if (response.split(' ').length > maxLength) {
      return _.sortBy(optimalResponses, resp => resp.text.normalize().length).reverse()[0];
    }
    return undefined;
  }

  checkFocusPointMatch(response) {
    return _.find(this.focusPoints, fp => response.toLowerCase().indexOf(fp.text) === -1);
  }
}
