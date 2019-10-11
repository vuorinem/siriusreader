import { HttpClient } from 'aurelia-fetch-client';
import { autoinject } from "aurelia-framework";

import { ICourseDetails } from './i-course-details';

@autoinject
export class CourseService {
    constructor(private http: HttpClient) {
    }

    public async getCourses(year: number): Promise<ICourseDetails[]> {
        const response = await this.http
            .fetch(`/course/year/${year}`);

        return response.json();
    }
}