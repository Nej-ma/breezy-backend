/**
 * Role constants and utilities for the Breezy application
 */

// Available roles in the system
export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [ROLES.USER]: 1,
  [ROLES.MODERATOR]: 2,
  [ROLES.ADMIN]: 3
};

// Get all valid roles
export const getValidRoles = () => {
  return Object.values(ROLES);
};

// Check if a role is valid
export const isValidRole = (role) => {
  return getValidRoles().includes(role);
};

// Check if role1 has higher or equal permissions than role2
export const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Check if user can perform action on target user
export const canModifyUser = (currentUserRole, targetUserRole) => {
  // Admins can modify anyone except themselves when demoting from admin
  if (currentUserRole === ROLES.ADMIN) {
    return true;
  }
  
  // Moderators can modify users but not other moderators or admins
  if (currentUserRole === ROLES.MODERATOR) {
    return targetUserRole === ROLES.USER;
  }
  
  // Users can't modify anyone's role
  return false;
};

// Permission matrix based on your project requirements
export const PERMISSIONS = {
  // Primary features (Fx1-Fx11)
  CREATE_ACCOUNT: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN], // Visitors can create, but handled separately
  AUTHENTICATE: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  PUBLISH_POSTS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  VIEW_OWN_PROFILE: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  VIEW_TIMELINE: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  LIKE_POSTS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  COMMENT_POSTS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  REPLY_COMMENTS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  FOLLOW_USERS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  MANAGE_PROFILE: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  
  // Secondary features (Fx12-Fx23)
  ADD_TAGS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  SEARCH_TAGS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  RECEIVE_NOTIFICATIONS: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  PRIVATE_MESSAGES: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  UPLOAD_MEDIA: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  REPORT_CONTENT: [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  
  // Moderation features
  SUSPEND_USERS: [ROLES.MODERATOR, ROLES.ADMIN],
  VIEW_ALL_PROFILES: [ROLES.MODERATOR, ROLES.ADMIN],
  MODERATE_CONTENT: [ROLES.MODERATOR, ROLES.ADMIN],
  
  // Admin features
  MANAGE_USER_ROLES: [ROLES.ADMIN],
  CREATE_ACCOUNTS_FOR_OTHERS: [ROLES.ADMIN], // Fx1 for admins
  SYSTEM_ADMINISTRATION: [ROLES.ADMIN]
};

// Check if user has specific permission
export const hasSpecificPermission = (userRole, permission) => {
  return PERMISSIONS[permission]?.includes(userRole) || false;
};

export default {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  getValidRoles,
  isValidRole,
  hasPermission,
  canModifyUser,
  hasSpecificPermission
};
