import jwt from 'jsonwebtoken';
import { Roles } from '../constants/index';

export interface ITokenPayload {
  id: string;
  role: Roles;
  companyId?: string;
  portalType: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE';
}

export const generateAccessToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'secret', {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret') as ITokenPayload;
};

export const verifyRefreshToken = (token: string): ITokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as ITokenPayload;
};