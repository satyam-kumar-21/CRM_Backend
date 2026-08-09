import { Router } from 'express';
import { CompanyAuthController } from '../controllers/companyAuthController';
import { authenticate } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/rbacMiddleware';
import { enforceTenant } from '../middlewares/tenantMiddleware';
import { companyLoginValidation, createEmployeeValidation, updateEmployeeValidation, createGroupValidation, updateGroupValidation, postMessageValidation, leadValidation, saleValidation } from '../validators/companyValidator';
import { CompanySalesController } from '../controllers/companySales.controller';
import { Roles } from '../constants/index';

const router = Router();

router.post('/login', companyLoginValidation, CompanyAuthController.login);
router.post('/logout', CompanyAuthController.logout);
router.get('/validate', authenticate, enforceTenant, CompanyAuthController.validateSession);

router.use(authenticate, enforceTenant);

router.get('/dashboard', authorizeRoles(Roles.COMPANY_ADMIN, Roles.HR, Roles.MANAGER, Roles.TEAM_LEAD, Roles.EMPLOYEE, Roles.SALES, Roles.TECH_SUPPORT, Roles.IT, Roles.INTERN), CompanyAuthController.getDashboard);
router.get('/employees', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.getEmployees);
router.post('/employees', authorizeRoles(Roles.COMPANY_ADMIN), createEmployeeValidation, CompanyAuthController.createEmployee);
router.patch('/employees/:id', authorizeRoles(Roles.COMPANY_ADMIN), updateEmployeeValidation, CompanyAuthController.updateEmployee);
router.patch('/employees/:id/status', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.updateEmployeeStatus);
router.delete('/employees/:id', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.deleteEmployee);
router.patch('/employees/:id/permissions', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.updateEmployeePermissions);
router.get('/leads', authorizeRoles(Roles.COMPANY_ADMIN), CompanySalesController.getLeads);
router.post('/leads', authorizeRoles(Roles.COMPANY_ADMIN), leadValidation, CompanySalesController.createLead);
router.patch('/leads/:id', authorizeRoles(Roles.COMPANY_ADMIN), leadValidation, CompanySalesController.updateLead);
router.delete('/leads/:id', authorizeRoles(Roles.COMPANY_ADMIN), CompanySalesController.deleteLead);
router.get('/sales', authorizeRoles(Roles.COMPANY_ADMIN), CompanySalesController.getSales);
router.post('/sales', authorizeRoles(Roles.COMPANY_ADMIN), saleValidation, CompanySalesController.createSale);
router.patch('/sales/:id', authorizeRoles(Roles.COMPANY_ADMIN), saleValidation, CompanySalesController.updateSale);
router.delete('/sales/:id', authorizeRoles(Roles.COMPANY_ADMIN), CompanySalesController.deleteSale);
router.post('/groups', authorizeRoles(Roles.COMPANY_ADMIN), createGroupValidation, CompanyAuthController.createGroup);
router.patch('/groups/:groupId', authorizeRoles(Roles.COMPANY_ADMIN), updateGroupValidation, CompanyAuthController.updateGroup);
router.delete('/groups/:groupId', authorizeRoles(Roles.COMPANY_ADMIN), CompanyAuthController.deleteGroup);
const companyEmployeeRoles = [Roles.COMPANY_ADMIN, Roles.HR, Roles.MANAGER, Roles.TEAM_LEAD, Roles.EMPLOYEE, Roles.SALES, Roles.TECH_SUPPORT, Roles.IT, Roles.INTERN] as const;
router.post('/groups/:groupId/messages', authorizeRoles(...companyEmployeeRoles), postMessageValidation, CompanyAuthController.postMessage);
router.get('/groups/:groupId/messages', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.getGroupMessages);
router.get('/conversations/:conversationId/messages', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.getConversationMessages);
router.post('/conversations/:conversationId/messages', authorizeRoles(...companyEmployeeRoles), postMessageValidation, CompanyAuthController.postConversationMessage);
router.patch('/messages/:messageId', authorizeRoles(...companyEmployeeRoles), postMessageValidation, CompanyAuthController.updateMessage);
router.delete('/messages/:messageId', authorizeRoles(...companyEmployeeRoles), CompanyAuthController.deleteMessage);

export default router;
