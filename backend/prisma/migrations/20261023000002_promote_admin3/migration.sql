UPDATE "User"
SET "nama" = 'Admin 3',
    "role" = 'ADMIN',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'admin3@gmail.com';
