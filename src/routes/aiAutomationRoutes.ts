import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/rbacMiddleware';
import { enforceTenant } from '../middlewares/tenantMiddleware';
import { Roles } from '../constants/index';
import { AiAutomationController } from '../controllers/aiAutomationController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const adminOnly = authorizeRoles(Roles.COMPANY_ADMIN, Roles.MANAGER, Roles.IT);

router.post('/webhook/jivo', AiAutomationController.processWebhook);

router.use(authenticate, enforceTenant);

router.get('/dashboard', adminOnly, AiAutomationController.getDashboard);
router.post('/ask', adminOnly, AiAutomationController.askDbQuestion);
router.get('/settings', adminOnly, AiAutomationController.getSettings);
router.patch('/settings', adminOnly, AiAutomationController.updateSettings);

router.get('/connections', adminOnly, AiAutomationController.listConnections);
router.post('/connections', adminOnly, AiAutomationController.createConnection);
router.patch('/connections/:id', adminOnly, AiAutomationController.updateConnection);
router.post('/connections/:id/validate', adminOnly, AiAutomationController.validateConnection);

router.get('/knowledge-bases', adminOnly, AiAutomationController.listKnowledgeBases);
router.post('/knowledge-bases', adminOnly, AiAutomationController.createKnowledgeBase);
router.post('/knowledge-bases/:id/upload', adminOnly, upload.single('file'), AiAutomationController.uploadKnowledgeFile);

router.get('/conversations', adminOnly, AiAutomationController.listConversations);
router.get('/conversations/:id', adminOnly, AiAutomationController.getConversation);
router.post('/simulate/jivo', adminOnly, AiAutomationController.processMockJivo);

export default router;
