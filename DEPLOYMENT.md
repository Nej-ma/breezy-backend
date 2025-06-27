# 🚀 Déploiement Breezy Backend

## 📋 Fichiers d'environnement

### **Développement**
- Fichier: `.env`
- Utilisation: `docker-compose up -d`

### **Production (sans SSL)**
- Fichier: `.env.prod` 
- Utilisation: `start-prod.bat` ou `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d`

### **Production (avec SSL)**
- Fichier: `.env.prod`
- Utilisation: `start-prod-ssl.bat` ou `docker-compose -f docker-compose.prod-ssl.yml --env-file .env.prod up -d`

## 🔧 Configuration des variables d'environnement

### **Obligatoire dans .env.prod :**
```env
# JWT Secrets (GÉNÉREZ VOS PROPRES CLÉS !)
JWT_SECRET=votre-cle-jwt-secrete-64-caracteres-minimum
JWT_REFRESH_SECRET=votre-cle-refresh-secrete-64-caracteres-minimum

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application

# Domaines (pour SSL)
ACME_EMAIL=admin@breezy.website
MAIN_DOMAIN=breezy.website
API_DOMAIN=api.breezy.website
```

## 🔑 Génération des secrets JWT

Pour générer des secrets sécurisés :

```bash
# JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret  
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```


## 🌐 Accès aux services

### **Développement**
- API Gateway: http://api.breezy.website
- Traefik Dashboard: http://localhost:8081
- Documentation: http://api.breezy.website/docs

### **Production (sans SSL)**
- API Gateway: http://api.breezy.website
- Traefik Dashboard: http://localhost:8081 
- Documentation: http://api.breezy.website/docs

### **Production (avec SSL)**
- API: https://api.breezy.website
- Site: https://breezy.website
- Documentation: https://breezy.website/docs

## 🔍 Vérification du déploiement

```bash
# Voir l'état des services
docker-compose -f docker-compose.prod-ssl.yml --env-file .env.prod ps

# Voir les logs
docker-compose -f docker-compose.prod-ssl.yml --env-file .env.prod logs -f

# Tester l'API
curl https://api.breezy.website/api/auth/health
```

## 🛠️ Résolution des problèmes

### **"secret or public key must be provided"**
- Vérifiez que `JWT_SECRET` est défini dans `.env.prod`
- Vérifiez que vous utilisez `--env-file .env.prod`

### **Variables d'environnement non trouvées**
- Assurez-vous d'utiliser `--env-file .env.prod` dans la commande docker-compose
- Vérifiez que le fichier `.env.prod` existe et contient toutes les variables

### **Certificats SSL**
- Vérifiez que `ACME_EMAIL` est configuré
- Vérifiez que vos domaines pointent vers votre serveur
- Les certificats peuvent prendre quelques minutes à s'obtenir
