import { ITokenResponse } from './i-token-response';
import { autoinject, computedFrom } from "aurelia-framework";
import { EventAggregator } from 'aurelia-event-aggregator';
import { HttpClient } from "aurelia-fetch-client";
import * as environment from '../../config/environment.json';
import 'url-search-params-polyfill';

const TokenStorageKey = "nr-token";
const RefreshTimeoutKey = "nr-token-refresh";

export const EventLogin = "login";
export const EventLogout = "logout";

@autoinject
export class AuthService {
    private tokenDetails: ITokenResponse | null = null;
    private expiresAt?: Date;
    private storage: Storage;

    private refreshTimerHandler?: number;

    @computedFrom("tokenDetails")
    public get isAuthenticated(): boolean {
        return !!this.tokenDetails;
    }

    @computedFrom("tokenDetails")
    public get token(): string | undefined {
        if (!this.tokenDetails) {
            return;
        }

        return this.tokenDetails.access_token;
    }

    constructor(
        private http: HttpClient,
        private eventAggregator: EventAggregator) {

        this.storage = sessionStorage;

        this.load();

        const authService = this;

        this.http.baseUrl = environment.apiUrl;

        this.http.interceptors.push({
            request(request: Request) {
                if (authService.token) {
                    request.headers.append('Authorization', 'Bearer ' + authService.token);
                }

                return request;
            },
            async response(response) {
                if (response.status === 401) {
                    const refreshSuccessful = await authService.refresh();

                    if (!refreshSuccessful && authService.isAuthenticated) {
                        authService.logout();
                    }
                }

                return response;
            }
        });
    }

    public async authenticate(email: string, password: string): Promise<boolean> {
        const request = new URLSearchParams();
        request.append("grant_type", "password");
        request.append("username", email);
        request.append("password", password);

        const response = await this.http
            .fetch(environment.tokenEndpoint, {
                method: "post",
                body: request.toString(),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

        if (!response.ok) {
            return false;
        }

        this.setToken(await response.json());

        this.eventAggregator.publish(EventLogin);

        return true;
    }

    public logout() {
        this.setToken(null);

        this.eventAggregator.publish(EventLogout);
    }

    public async refresh(): Promise<boolean> {
        if (!this.tokenDetails) {
            return false;
        }

        const request = new URLSearchParams();
        request.append("grant_type", "refresh_token");
        request.append("refresh_token", this.tokenDetails.refresh_token);

        const response = await this.http
            .fetch(environment.tokenEndpoint, {
                method: "post",
                body: request.toString(),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

        if (!response.ok) {
            this.setToken(null);
        } else {
            this.setToken(await response.json());
        }

        return this.isAuthenticated;
    }

    private setToken(tokenResponse: ITokenResponse | null) {
        this.tokenDetails = tokenResponse;
        this.expiresAt = this.calculateExpiresAt(tokenResponse);

        this.save();
    }

    private calculateExpiresAt(tokenResponse: ITokenResponse | null): Date | undefined {
        if (tokenResponse) {
            return new Date((new Date()).getTime() + tokenResponse.expires_in * 1000);
        } else {
            return undefined;
        }
    }

    private load() {
        const savedToken = this.storage.getItem(TokenStorageKey);

        if (savedToken) {
            this.tokenDetails = JSON.parse(savedToken);

            const savedExpiresAt = this.storage.getItem(RefreshTimeoutKey);

            if (savedExpiresAt) {
                this.expiresAt = new Date(savedExpiresAt);
            } else {
                // Token is stored but expiresAt is not, re-calculate from token
                this.expiresAt = this.calculateExpiresAt(this.tokenDetails);
            }
        } else {
            // No token stored, ensure that expiresAt is also clear
            this.expiresAt = undefined;
            this.storage.removeItem(RefreshTimeoutKey);
        }

        this.setRefreshTimer();
    }

    private save() {
        if (this.tokenDetails) {
            this.storage.setItem(TokenStorageKey, JSON.stringify(this.tokenDetails));
        } else {
            this.storage.removeItem(TokenStorageKey);
        }

        if (this.expiresAt) {
            this.storage.setItem(RefreshTimeoutKey, JSON.stringify(this.expiresAt.getTime()));
        } else {
            this.storage.removeItem(RefreshTimeoutKey);
        }

        this.setRefreshTimer();
    }

    private setRefreshTimer() {
        if (this.refreshTimerHandler) {
            clearTimeout(this.refreshTimerHandler);
            this.refreshTimerHandler = undefined;
        }

        if (this.tokenDetails && this.expiresAt) {
            const timeout = this.expiresAt.getTime() - (new Date().getTime());
            this.refreshTimerHandler = setTimeout(() => this.refresh(), timeout);
        }
    }

}
