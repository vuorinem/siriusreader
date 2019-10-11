import { ITopicDetails } from './i-topic-details';

export interface ICourseDetails {
    name: string;
    description: string;
    topics: ITopicDetails[];
}