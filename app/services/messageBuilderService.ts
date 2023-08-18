export function message(
    message: string,
    data: Record<string, any> = {},
    success: boolean = true
) {
    return {
        success,
        message,
        timestamp: new Date().toISOString(),
        data: {
            ...data
        }
    }
}

interface Error {
    code: string;
    message: string;
    data?: {
        [key: string]: string;
    };
}

interface ErrorResponse extends Error {
    timestamp: string;
}

export function errorMessages(errors: Error[]): { errors: ErrorResponse[] } {
    return {
        errors: errors.map(error => ({
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            data: {
                ...error.data
            }
        }))
    };
}

interface ValidatorError {
    type: string;
    value: string;
    msg: string;
    path: string;
    location: string;
}

export function errorMessagesFromValidator(errors: any): { errors: ErrorResponse[] } {
    return {
        errors: errors.array().map((error: ValidatorError) => ({
            code: error.msg.split(': ')[0],
            message: error.msg.split(': ')[1],
            timestamp: new Date().toISOString(),
            data: {
                path: error.path,
                location: error.location
            }
        }))
    };
}
