export class AppError extends Error {
  constructor(message, { code = "INTERNAL_ERROR", status = 500, retryable = false, details } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

export function publicError(error) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      retryable: error.retryable,
    };
  }
  return {
    message: "服务器暂时无法完成这次行动。",
    code: "INTERNAL_ERROR",
    retryable: true,
  };
}
