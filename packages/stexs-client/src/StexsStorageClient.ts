import { Session, SignedUrl } from './lib/types';

export class StexsStorageClient {
	private memoryCache = new Map<string, string>();

	private storageUrl: string;
	protected fetch: typeof fetch;

	// @ts-ignore
	constructor(fetch: typeof fetch, storageUrl: string) {
		this.storageUrl = storageUrl;
		this.fetch = fetch;
	}

	/**
	 * Retrieves presigned url for avatar by the given user id
	 */
	async getAvatarUrl(userId: string): Promise<string | undefined> {
		return await this._getSignedUrl(`avatars:${userId}`, `/storage/avatars/${userId}`);
	}

	/**
	 * Uploads avatar
	 *
	 * Note: action available for authenticated users only
	 */
	async uploadAvatar(file: Blob): Promise<Response> {
		const response = await this._request({
			path: `/storage/avatars`,
			method: 'POST'
		});

		const body = await response.json();

		const formData = new FormData();

		Object.keys(body.fields).forEach((key) => {
			formData.append(key, body.fields[key]);
		});
		formData.append('file', file, body.fields.key);

		return await fetch(body.url, {
			method: 'POST',
			body: formData,
		});
	}

	/**
	 * Deletes the current avatar from current user
	 *
	 * Note: action available for authenticated users only
	 */
	async deleteAvatar(): Promise<Response> {
		sessionStorage.removeItem(`avatars:${this._getSession()?.user.id}`);

		return await this._request({
			path: '/storage/avatars',
			method: 'DELETE',
		});
	}

	/**
	 * Creates avatar cache key for a specific user
	 */
	private createAvatarsCacheKey(userId: string): string {
		return `avatar:${userId}`;
	}

	/**
	 * Sets avatar ETag in memory cache for a specific user to be used across all avatar component instances
	 */
	setAvatarETagInCache(userId: string, ETag: string): void {
		this.memoryCache.set(this.createAvatarsCacheKey(userId), ETag);
	}
	
	/**
	 * Gets avatar ETag from memory cache for a specific user
	 */
	getAvatarETagFromCache(userId: string): string | null {
		return this.memoryCache.get(this.createAvatarsCacheKey(userId)) || null;
	}

	/**
	 * Deletes avatar ETag from memory cache for a specific user
	 */
	deleteAvatarCache(userId: string): boolean {
		return this.memoryCache.delete(this.createAvatarsCacheKey(userId));
	}

	/**
	 * Retrieves presigned url for item thumbnail by the given item id
	 */
	async getItemThumbnailUrl(itemId: string): Promise<string | undefined> {
		return await this._getSignedUrl(
			`items:${itemId}`,
			`/storage/items/thumbnail/${itemId}`,
		);
	}

	/**
	 * Retrieves presigned post url for item thumbnail by the given item id
	 *
	 * Note: action available for authenticated users only
	 */
	async getItemThumbnailPostUrl(itemId: string): Promise<Response> {
		return await this._request({
			path: `/storage/items/thumbnail/${itemId}`,
			method: 'POST',
		});
	}

	/**
	 * Retrieves presigned url for project logo by the given project id
	 */
	async getProjectLogoUrl(projectId: string): Promise<string | undefined> {
		return await this._getSignedUrl(
			`projects:${projectId}`,
			`/storage/projects/${projectId}`,
		);
	}

	/**
	 * Retrieves presigned post url for project logo by the given project id
	 *
	 * Note: action available for authenticated users only
	 */
	async getProjectLogoPostUrl(projectId: string): Promise<Response> {
		return await this._request({
			path: `/storage/projects/${projectId}`,
			method: 'POST',
		});
	}

	/**
	 * Deletes the projects logo by the given project id
	 *
	 * Note: action available for authenticated users only
	 */
	async deleteProjectLogo(projectId: string): Promise<Response> {
		return await this._request({
			path: `/storage/projects/${projectId}`,
			method: 'DELETE',
		});
	}

	/**
	 * Retrieves presigned url for organization logo by the given organization id
	 */
	async getOrganizationLogoUrl(
		organizationId: string,
	): Promise<string | undefined> {
		return await this._getSignedUrl(
			`organizations:${organizationId}`,
			`/storage/organizations/${organizationId}`,
		);
	}

	/**
	 * Retrieves presigned post url for organization logo by the given organization id
	 *
	 * Note: action available for authenticated users only
	 */
	async getOrganizationLogoPostUrl(organizationId: string): Promise<Response> {
		return await this._request({
			path: `/storage/organizations/${organizationId}`,
			method: 'POST',
		});
	}

	/**
	 * Deletes the organizations logo by the given organization id
	 *
	 * Note: action available for authenticated users only
	 */
	async deleteOrganizationLogo(organizationId: string): Promise<Response> {
		return await this._request({
			path: `/storage/organizations/${organizationId}`,
			method: 'DELETE',
		});
	}

	private async _getSignedUrl(key: string, path: string): Promise<string | undefined> {
		const session = sessionStorage.getItem(key);
		const threshhold = 10 * 1000; // 10s

		if (session) {
			const signed = JSON.parse(session) as SignedUrl;

			if (signed.expires * 1000 - threshhold >= new Date().getTime()) {
				return signed.url;
			}
		}

		const response = await (
			await this._request({
				path,
			})
		).json();

		const url = response.url;

		if (url) {
			const searchParams = new URLSearchParams(url);

			try {
				sessionStorage.setItem(
					key,
					JSON.stringify({
						url,
						expires: searchParams.get('Expires'),
					}),
				);
			} catch (e) {
				if (e instanceof DOMException && e.name === 'QuotaExceededError') {
					sessionStorage.clear();
					sessionStorage.setItem(
						key,
						JSON.stringify({
							url,
							expires: searchParams.get('Expires'),
						}),
					);
				}
			}
		}

		return url;
	}

	private _getSession(): Session {
		return JSON.parse(localStorage.getItem('session') as string) as Session;
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
		const options: RequestInit = {
			method,
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
		};

		if (method !== 'GET' && body !== null) {
			options.body = JSON.stringify(body);
		}

		return await this.fetch(`${this.storageUrl}${path}`, options);
	}
}
