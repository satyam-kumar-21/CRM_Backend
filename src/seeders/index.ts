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

    const existing = await Company.findOne({ email: 'techno@admin.com' });
    if (existing) {
      console.log('[Seeder] Techno Sky Solutions company already exists');
      await mongoose.connection.close();
      process.exit(0);
    }

    const company = await Company.create({
      companyIdString: 'COMP-001',
      companyCode: 'TECHNO',
      name: 'Techno Sky Solutions',
      email: 'techno@admin.com',
      phone: '+0000000000',
      planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const hashedPassword = await bcrypt.hash('12345678', 10);

    let empId = generateEmployeeId();
    while (await Employee.exists({ companyId: company._id, employeeId: empId })) {
      empId = generateEmployeeId();
    }

    await Employee.create({
      companyId: company._id,
      employeeId: empId,
      name: 'Company Admin',
      email: 'techno@admin.com',
      passwordHash: hashedPassword,
      phone: '+0000000000',
      role: Roles.COMPANY_ADMIN,
      permissions: [],
      isSuspended: false,
      refreshTokens: [],
    });

    console.log('[Seeder] Techno Sky Solutions and admin created successfully');
    console.log('Admin email: techno@admin.com');
    console.log('Admin password: 12345678');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedDefaultCompany();