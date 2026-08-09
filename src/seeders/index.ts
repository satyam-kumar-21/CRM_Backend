import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Company } from '../models/Company';
import { Employee } from '../models/Employee';
import { Roles } from '../constants';

const generateEmployeeId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
};

const seedDefaultCompany = async () => {
  try {
    await connectDB();

    const existing = await Company.findOne({ name: 'Default Company' });
    if (existing) {
      console.log('[Seeder] Default company already exists');
      await mongoose.connection.close();
      process.exit(0);
    }

    const company = await Company.create({
      companyIdString: 'COMP-001',
      companyCode: 'DEFAULT',
      name: 'Default Company',
      email: 'admin@gmail.com',
      phone: '+0000000000',
      planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const hashedPassword = await bcrypt.hash('admin123', 10);

    let empId = generateEmployeeId();
    while (await Employee.exists({ companyId: company._id, employeeId: empId })) {
      empId = generateEmployeeId();
    }

    await Employee.create({
      companyId: company._id,
      employeeId: empId,
      name: 'Company Admin',
      email: 'admin@gmail.com',
      passwordHash: hashedPassword,
      phone: '+0000000000',
      role: Roles.COMPANY_ADMIN,
      permissions: [],
      isSuspended: false,
      refreshTokens: [],
    });

    console.log('[Seeder] Default company and admin created');
    console.log('Admin email: admin@gmail.com');
    console.log('Admin password: admin123');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedDefaultCompany();