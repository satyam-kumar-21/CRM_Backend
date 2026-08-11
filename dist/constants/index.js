"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Priority = exports.TaskStatus = exports.LeaveStatus = exports.AttendanceStatus = exports.SubscriptionPlan = exports.CompanyStatus = exports.Roles = void 0;
var Roles;
(function (Roles) {
    Roles["SUPER_ADMIN"] = "SUPER_ADMIN";
    Roles["COMPANY_ADMIN"] = "COMPANY_ADMIN";
    Roles["HR"] = "HR";
    Roles["MANAGER"] = "MANAGER";
    Roles["TEAM_LEAD"] = "TEAM_LEAD";
    Roles["EMPLOYEE"] = "EMPLOYEE";
    Roles["SALES"] = "SALES";
    Roles["TECH_SUPPORT"] = "TECH_SUPPORT";
    Roles["IT"] = "IT";
    Roles["INTERN"] = "INTERN";
})(Roles || (exports.Roles = Roles = {}));
var CompanyStatus;
(function (CompanyStatus) {
    CompanyStatus["ACTIVE"] = "ACTIVE";
    CompanyStatus["BLOCKED"] = "BLOCKED";
    CompanyStatus["SUSPENDED"] = "SUSPENDED";
    CompanyStatus["DELETED"] = "DELETED";
})(CompanyStatus || (exports.CompanyStatus = CompanyStatus = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["BASIC"] = "BASIC";
    SubscriptionPlan["PROFESSIONAL"] = "PROFESSIONAL";
    SubscriptionPlan["ENTERPRISE"] = "ENTERPRISE";
    SubscriptionPlan["UNLIMITED"] = "UNLIMITED";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["HALF_DAY"] = "HALF_DAY";
    AttendanceStatus["HOLIDAY"] = "HOLIDAY";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
})(LeaveStatus || (exports.LeaveStatus = LeaveStatus = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["TODO"] = "TODO";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["IN_REVIEW"] = "IN_REVIEW";
    TaskStatus["COMPLETED"] = "COMPLETED";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "LOW";
    Priority["MEDIUM"] = "MEDIUM";
    Priority["HIGH"] = "HIGH";
    Priority["URGENT"] = "URGENT";
})(Priority || (exports.Priority = Priority = {}));
