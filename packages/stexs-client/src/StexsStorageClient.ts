export class StexsStorageClient {
    private storageUrl: string;
    private fetch: typeof fetch;

    constructor(fetch: typeof fetch, storageUrl: string) {
        this.storageUrl = storageUrl;
        this.fetch = fetch;
    }

    /**
     * Returns presigned url for avatar of the given username
     *       
     * @param username - username of the user which the avatar is requested
     */
    async getAvatarUrl(username: string) {
        return await this._request({ 
            path: `avatars/${username}` 
        });
    }

    private async _request({
        path,
        method = 'GET',
        body = undefined,
        headers = {},
      }: {
        path: string;
        method?: string;
        body?: object;
        headers?: Record<string, string>;
      }): Promise<Response> {
        try {
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
            };

            if (method !== 'GET' && body !== null) {
                options.body = JSON.stringify(body);
            }

            return await this.fetch(`${this.storageUrl}/${path}`, options);
        } catch (e) {
            throw e;
        }
    }
}   
