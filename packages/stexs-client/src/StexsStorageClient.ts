export class StexsStorageClient {
    private storageUrl: string;
    private fetch: typeof fetch;

    constructor(fetch: typeof fetch, storageUrl: string) {
        this.storageUrl = storageUrl;
        this.fetch = fetch;
    }

    /**
     * Returns presigned url for avatar of the given user id
     *       
     * @param userId - user id of the user which the avatar is requested
     * @returns {Promise<Response>}
     */
    async getAvatarUrl(userId: string): Promise<Response> {
        return await this._request({ 
            path: `avatars/${userId}` 
        });
    }

    /**
     * Returns a presigned url for item thumbnail of the given item id
     * 
     * @param itemId - item id for requesting the thumbnail url
     * @returns {Promise<Response>}
     */
    async getItemThumbnailUrl(itemId: string): Promise<Response> {
        return await this._request({ 
            path: `items/thumbnail/${itemId}` 
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
