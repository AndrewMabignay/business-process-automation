export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

export function successResponse<T>(message: string, data: T): ApiResponse<T> {
    return {
        success: true,
        message,
        data,
    };
}

export function errorResponse<T = null>(
    message: string,
    data: T | null = null,
): ApiResponse<T> {
    return {
        success: false,
        message,
        data,
    };
}
