import { IAnswer } from './i-answer';
import { IQuestionDetails } from './i-question-details';

export class QuestionAndAnswer {

    constructor(
        public question: IQuestionDetails,
        public answer: IAnswer) {
    }
    
}