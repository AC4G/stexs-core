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

export function errorMessage(
    code: string, 
    message: string,
    data: Record<string, any> = {}
) {
    return {
        error: {
            code,
            message,
            timestamp: new Date().toISOString(),
            data: {
                ...data
            }
        }
    }
}
