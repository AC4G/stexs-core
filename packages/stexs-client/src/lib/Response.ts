export class ApiResponse<TSuccess, TError> extends Response {
    constructor(response: Response) {
        super(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
    }

    /**
     * Type-safe `.json()` method returning either TSuccess or TError based on response content.
     */
    async json(): Promise<TSuccess | TError> {
        const rawData = await super.json();
    
        if (this.isError(rawData)) {
            return rawData as TError;
        }

        return rawData as TSuccess;
    }
  
    /**
     * Get the success body directly, throwing an error if the response is not successful.
     */
    async getSuccessBody(): Promise<TSuccess> {
        const rawData = await super.json();
    
        if (!this.isError(rawData)) {
            return rawData as TSuccess;
        }
        
        throw new Error('The response is not a success response.');
    }
  
    /**
     * Get the error body directly, throwing an error if the response is successful.
     */
    async getErrorBody(): Promise<TError> {
        const rawData = await super.json();
    
        if (this.isError(rawData)) {
            return rawData as TError;
        }
        
        throw new Error('The response is not an error response.');
    }

    /**
     * Determines whether the response is unsuccessful based on its structure.
     * Checks if the `errors` field exists.
     */
    private isError(data: any): boolean {
        return Array.isArray(data.errors);
    }

    /**
     * Clone the current ApiResponse and return a new ApiResponse object.
     * Instead of calling `new ApiResponse`, directly use the constructor to return an `ApiResponse`.
     */
    clone(): ApiResponse<TSuccess, TError> {
        const clonedResponse = super.clone();
        return new ApiResponse<TSuccess, TError>(clonedResponse);
    }
}
