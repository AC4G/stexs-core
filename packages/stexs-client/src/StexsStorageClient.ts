export class StexsStorageClient {
    private storageUrl: string;
    private fetch: typeof fetch;

    constructor(fetch: typeof fetch, storageUrl: string) {
        this.storageUrl = storageUrl;
        this.fetch = fetch;
    }

    /**
     * Retrieves presigned url for avatar by the given user id
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
     * Retrieves presigned post url for uploading a new avatar
     * 
     * Note: action available for authenticated users only
     * 
     * @returns {Promise<Response>}
     */
    async getAvatarPostUrl(): Promise<Response> {
        return await this._request({
            path: `avatars`,
            method: 'POST'
        });
    }

    /**
     * Deletes the current avatar
     * 
     * Note: action available for authenticated users only
     * 
     * @returns {Promise<Response>}
     */
    async deleteAvatar(): Promise<Response> {
        return await this._request({
            path: 'avatars',
            method: 'DELETE'
        });
    }

    /**
     * Retrieves presigned url for item thumbnail by the given item id
     * 
     * @param itemId - item id for requesting the thumbnail url
     * @returns {Promise<Response>}
     */
    async getItemThumbnailUrl(itemId: string): Promise<Response> {
        return await this._request({ 
            path: `items/thumbnail/${itemId}` 
        });
    }

    /**
     * Retrieves presigned post url for item thumbnail by the given item id
     * 
     * Note: action available for authenticated users only
     * 
     * @param itemId - item id for requesting the thumbnail post url
     * @returns {Promise<Response>}
     */
    async getItemThumbnailPostUrl(itemId: string): Promise<Response> {
        return await this._request({
            path: `items/thumbnail/${itemId}`,
            method: 'POST'
        });
    }

    /**
     * Retrieves presigned url for project logo by the given project id 
     * 
     * @param projectId - project id for requesting the logo url
     * @returns {Promise<Response>}
     */
    async getProjectLogoUrl(projectId: string): Promise<Response> {
        return await this._request({
            path: `projects/${projectId}`,
            method: 'GET'
        });
    }

    /**
     * Retrieves presigned post url for project logo by the given project id 
     * 
     * Note: action available for authenticated users only
     * 
     * @param projectId - project id for requesting the logo post url
     * @returns {Promise<Response>}
     */
    async getProjectLogoPostUrl(projectId: string): Promise<Response> {
        return await this._request({
            path: `projects/${projectId}`,
            method: 'POST'
        });
    }

    /**
     * Deletes the projects logo by the given project id
     * 
     * Note: action available for authenticated users only
     * 
     * @param projectId - id of the project from which the logo needs to be deleted
     * @returns {Promise<Response>}
     */
    async deleteProjectLogo(projectId: string): Promise<Response> {
        return await this._request({
            path: `projects/${projectId}`,
            method: 'DELETE'
        });
    }

    private async _request({
        path,
        method = 'GET',
        body = undefined,
        headers = {},
      }: {
        path: string;
        method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
        body?: Record<string, any>;
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
