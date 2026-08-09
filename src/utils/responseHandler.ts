import { Response } from 'express';

export interface IPaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string,
    data: T,
    statusCode: number = 200,
    pagination?: IPaginationMeta
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(pagination && { pagination }),
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors: any = null
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }
}