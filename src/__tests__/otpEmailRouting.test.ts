import assert from 'node:assert/strict';

const emailService = require('../utils/emailService');
const loginOtpModel = require('../models/LoginOtp');
const employeeModel = require('../models/Employee');
const { OtpService } = require('../services/otpService');

(async () => {
  let sentTo = '';

  emailService.sendLoginOtpEmail = async (to: string) => {
    sentTo = to;
  };

  loginOtpModel.LoginOtp.deleteMany = async () => undefined;
  loginOtpModel.LoginOtp.create = async () => ({ _id: 'otp-session-id' });

  const employeeRecord: any = {
    _id: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439012',
    email: 'stored.employee@example.com',
    name: 'Stored Employee',
  };

  employeeModel.Employee.findOne = () => ({
    select: () => employeeRecord,
  });

  const result = await OtpService.createAndSendLoginOtp(
    '507f1f77bcf86cd799439011',
    '507f1f77bcf86cd799439012',
    'attacker@example.com',
    'Stored Employee',
  );

  assert.equal(sentTo, 'stored.employee@example.com');
  assert.equal(result.maskedEmail, 'st**************@example.com');
  console.log('otp email routing ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
