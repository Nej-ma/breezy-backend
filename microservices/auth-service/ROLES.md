# Système de Rôles - Breezy Auth Service

## Vue d'ensemble

Le service d'authentification de Breezy implémente un système de contrôle d'accès basé sur les rôles (RBAC) avec trois niveaux de permissions.

## Rôles Disponibles

### 👤 User (Utilisateur)
- Rôle par défaut pour tous les nouveaux comptes
- Accès aux fonctionnalités de base de l'application
- Permissions : publication, commentaires, likes, profil, etc.

### 🛡️ Moderator (Modérateur)
- Rôle intermédiaire avec des permissions de modération
- Peut suspendre des utilisateurs réguliers
- Accès à toutes les fonctionnalités utilisateur + modération

### 👑 Admin (Administrateur)
- Rôle avec tous les privilèges
- Peut gérer les rôles de tous les utilisateurs
- Peut suspendre n'importe quel utilisateur
- Accès complet au système
- Tous les développeurs de Breezy sont admins et ce sont les seuls admins.

## API Endpoints

### Routes d'Administration

```http
GET /api/auth/admin/users
```
Récupère la liste de tous les utilisateurs (Admin/Moderator)

**Query Parameters:**
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre d'utilisateurs par page (défaut: 10)
- `role`: Filtrer par rôle (`user`, `moderator`, `admin`)
- `suspended`: Filtrer par statut de suspension (`true`/`false`)

```http
GET /api/auth/admin/users/:userId
```
Récupère un utilisateur par ID (Admin/Moderator)

```http
PUT /api/auth/admin/users/:userId/role
```
Met à jour le rôle d'un utilisateur (Admin uniquement)

**Body:**
```json
{
  "role": "moderator"
}
```

```http
POST /api/auth/admin/users/:userId/suspend
```
Suspend un utilisateur (Admin/Moderator)

**Body:**
```json
{
  "duration": 24,
  "reason": "Violation des règles communautaires"
}
```

```http
POST /api/auth/admin/users/:userId/unsuspend
```
Lève la suspension d'un utilisateur (Admin/Moderator)

## Utilisation des Middlewares

### Authentication Middleware
```javascript
import authMiddleware from '../middleware/auth.middleware.js';

// Protège une route avec authentification
router.get('/protected', authMiddleware, (req, res) => {
  // req.user contient les informations de l'utilisateur
  res.json({ user: req.user });
});
```

### Role Middleware
```javascript
import { requireAdmin, requireModerator, requireRole } from '../middleware/role.middleware.js';

// Réservé aux admins
router.delete('/admin/users/:id', authMiddleware, requireAdmin, deleteUser);

// Réservé aux modérateurs et admins
router.get('/admin/reports', authMiddleware, requireModerator, getReports);

// Rôle personnalisé
router.get('/special', authMiddleware, requireRole(['admin', 'moderator']), handler);
```

## Matrice des Permissions

| Fonctionnalité | Visiteur | User | Moderator | Admin |
|----------------|----------|------|-----------|-------|
| Création de compte | ✅ | ❌ | ❌ | ✅ |
| Authentification | ❌ | ✅ | ✅ | ✅ |
| Publication de messages | ❌ | ✅ | ✅ | ✅ |
| Modération de contenu | ❌ | ❌ | ✅ | ✅ |
| Gestion des rôles | ❌ | ❌ | ❌ | ✅ |
| Suspension d'utilisateurs | ❌ | ❌ | ✅ | ✅ |

## Exemples d'Usage

### Vérifier le rôle dans un contrôleur
```javascript
const someController = async (req, res) => {
  const { role } = req.user;
  
  if (role === 'admin') {
    // Logique admin
  } else if (role === 'moderator') {
    // Logique modérateur
  } else {
    // Logique utilisateur standard
  }
};
```

### Utiliser les utilitaires de rôles
```javascript
import { ROLES, hasPermission, canModifyUser } from '../utils/roles.js';

// Vérifier les permissions
if (hasPermission(userRole, ROLES.MODERATOR)) {
  // L'utilisateur a au moins les permissions de modérateur
}

// Vérifier si un utilisateur peut en modifier un autre
if (canModifyUser(currentUserRole, targetUserRole)) {
  // Modification autorisée
}
```

## Gestion des Tokens JWT

Les tokens JWT incluent maintenant le rôle de l'utilisateur :

```json
{
  "userId": "60d0fe4f5311236168a109ca",
  "role": "moderator",
  "iat": 1624285295,
  "exp": 1624286195
}
```

## Sécurité

### Règles de Protection
- Un admin ne peut pas se rétrograder lui-même
- Un modérateur ne peut pas suspendre un admin
- Un utilisateur ne peut pas modifier son propre rôle
- Les tokens sont automatiquement mis à jour lors du changement de rôle

### Validation
- Tous les rôles sont validés contre une liste prédéfinie
- Les permissions sont vérifiées à chaque requête
- Les comptes suspendus sont automatiquement déconnectés


## Configuration

Variables d'environnement nécessaires :
- `JWT_SECRET`: Clé secrète pour les tokens d'accès
- `JWT_REFRESH_SECRET`: Clé secrète pour les tokens de rafraîchissement
- `JWT_EXPIRES_IN`: Durée de vie des tokens d'accès (défaut: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Durée de vie des tokens de rafraîchissement (défaut: 7d)

## Intégration avec les Autres Services

Les autres microservices peuvent valider les tokens et récupérer les informations de rôle via :

```http
POST /api/auth/validate-token
```

**Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "60d0fe4f5311236168a109ca",
    "username": "johndoe",
    "role": "moderator",
    ...
  }
}
```
