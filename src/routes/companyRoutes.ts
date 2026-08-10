import { Router } from 'express';
import { CompanyAuthController } from '../controllers/companyAuthController';
import { authenticate } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/rbacMiddleware';
import { enforceTenant } from '../middlewares/tenantMiddleware';
import { companyLoginValidation, createEmployeeValidation, updateEmployeeValidation, createGroupValidation, updateGroupValidation, postMessageValidation, leadValidation, saleValidation } from '../validators/companyValidator';
import { CompanySalesController } from '../controllers/companySales.controller';
import { Roles } from '../constants/index';
import { AttendanceController } from '../controllers/attendanceController';
import { AnnouncementController } from '../controllers/announcementController';
import { LeaveController } from '../controllers/leaveController';

const router = Router();

router.post('/login', companyLoginValidation, CompanyAuthController.login);
router.get('/validate', authenticate, enforceTenant, CompanyAuthController.validateSession);

router.use(authenticate, enforceTenant);
router.post('/logout', CompanyAuthController.logout);

router.get('/dashboard', authorizeRoles(Roles.COMPANY_ADMIN, Roles.HR, Roles.MANAGER, Roles.TEAM_LEAD, Roles.EMPLOYEE, Roles.SALES, Roles.TECH_SUPPORT, Roles.IT, Roles.INTERN), CompanyAuthController.getDashboard);
const companyEmployeeRoles = [Roles.COMPANY_ADMIN, Roles.HR, Roles.MANAGER, Roles.TEAM_LEAD, Roles.EMPLOYEE, Roles.SALES, Roles.TECH_SUPPORT, Roles.IT, Roles.INTERN] as const;
router.get('/attendance', authorizeRoles(...companyEmployeeRoles), AttendanceController.list);
router.get('/attendance/employees', authorizeRoles(Roles.COMPANY_ADMIN), AttendanceController.employees);
router.get('/announcements', authorizeRoles(...companyEmployeeRoles), AnnouncementController.list);
router.post('/announcements', authorizeRoles(Roles.COMPANY_ADMIN), AnnouncementController.create);
router.delete('/announcements/:id', authorizeRoles(Roles.COMPANY_ADMIN), AnnouncementController.remove);
router.get('/leave', authorizeRoles(...companyEmployeeRoles), LeaveController.list);
router.patch('/leave/:id/status', authorizeRoles(Roles.COMPANY_ADMIN), LeaveController.updateStatus);
router.get('/employees', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.getEmployees);
router.post('/employees', authorizeRoles(Roles.COMPANY_ADMIN), createEmployeeValidation, CompanyAuthController.createEmployee);
router.patch('/employees/:id', authorizeRoles(Roles.COMPANY_ADMIN), updateEmployeeValidation, CompanyAuthController.updateEmployee);
router.patch('/employees/:id/status', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.updateEmployeeStatus);
router.delete('/employees/:id', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.deleteEmployee);
router.patch('/employees/:id/permissions', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.updateEmployeePermissions);
router.get('/leads', authorizeRoles(...companyEmployeeRoles), CompanySalesController.getLeads);
router.post('/leads', authorizeRoles(...companyEmployeeRoles), leadValidation, CompanySalesController.createLead);
router.patch('/leads/:id', authorizeRoles(...companyEmployeeRoles), leadValidation, CompanySalesController.updateLead);
router.delete('/leads/:id', authorizeRoles(Roles.COMPANY_ADMIN), CompanySalesController.deleteLead);
router.get('/sales', authorizeRoles(...companyEmployeeRoles), CompanySalesController.getSales);
router.post('/sales', authorizeRoles(...companyEmployeeRoles), saleValidation, CompanySalesController.createSale);
router.patch('/sales/:id', authorizeRoles(...companyEmployeeRoles), saleValidation, CompanySalesController.updateSale);
router.delete('/sales/:id', authorizeRoles(Roles.COMPANY_ADMIN), CompanySalesController.deleteSale);
router.post('/groups', authorizeRoles(Roles.COMPANY_ADMIN), createGroupValidation, CompanyAuthController.createGroup);
router.patch('/groups/:groupId', authorizeRoles(Roles.COMPANY_ADMIN), updateGroupValidation, CompanyAuthController.updateGroup);
router.delete('/groups/:groupId', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.deleteGroup);
router.post('/groups/:groupId/messages', authorizeRoles(...companyEmployeeRoles), postMessageValidation, CompanyAuthController.postMessage);
router.get('/groups/:groupId/messages', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.getGroupMessages);
router.get('/conversations/:conversationId/messages', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.getConversationMessages);
router.post('/conversations/:conversationId/read', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.markConversationRead);
router.post('/conversations/:conversationId/messages', authorizeRoles(...companyEmployeeRoles), postMessageValidation, CompanyAuthController.postConversationMessage);
router.patch('/messages/:messageId', authorizeRoles(...companyEmployeeRoles), postMessageValidation, CompanyAuthController.updateMessage);
router.delete('/messages/:messageId', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.deleteMessage);

export default router;
