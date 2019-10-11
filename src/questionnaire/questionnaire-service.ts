import { autoinject } from "aurelia-framework";
import { json, HttpClient } from 'aurelia-fetch-client';

import { UserService } from './../user/user-service';
import { IQuestionnaireDetails } from './i-questionnaire-details';
import { IAnswer } from './i-answer';

@autoinject
export class QuestionnaireService {

    constructor(
        private http: HttpClient,
        private userService: UserService) {
    }

    public async getQuestionnaire(questionnaireName: string): Promise<IQuestionnaireDetails> {
        const response = await this.http
            .fetch(`/questionnaire/${questionnaireName}`);

        if (!response.ok) {
            throw Error('Error trying to load questionnaire');
        }

        return response.json();
    }

    public async sendAnswers(questionnaireName: string, answers: IAnswer[]): Promise<void> {
        const response = await this.http
            .fetch(`/questionnaire/${questionnaireName}/answers`, {
                method: 'post',
                body: json(answers),
            });

        if (!response.ok) {
            throw new Error('Error sending questionnaire answers');
        }

        this.userService.load();
    }

}