export interface ITokenResponse {
    scope: string;
    token_type: string;
    access_token: string;
    expires_in: number;
    refresh_token: string;
}
