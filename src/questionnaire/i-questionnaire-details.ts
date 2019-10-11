import { IQuestionDetails } from './i-question-details';

export interface IQuestionnaireDetails {
    name: string;
    description: string;
    questions: IQuestionDetails[];
}