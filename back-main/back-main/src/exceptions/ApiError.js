class ApiError extends Error {

    constructor(status, message, errors) {
        super(message);
        this.status = status
        this.errors = errors
    }

    static unauthorizedRequest(message='Unauthorized user') {
        return new ApiError(401, message)
    }

    static forbiddenRequest(message='Forbidden request') {
        return new ApiError(403, message)
    }

    static notFound(message = 'Not Found') {
        return new ApiError(404, message)
    }

    static badRequest(message, errors = []) {
        return new ApiError(400, message, errors)
    }

    static internalError(message='Unexpected error', errors= []) {
        return new ApiError(500, message, errors)
    }
}

module.exports = ApiError