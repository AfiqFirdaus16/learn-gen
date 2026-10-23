INSERT INTO "User" ("nama", "email", "password", "role", "updatedAt")
VALUES (
  'Admin 3',
  'admin3@gmail.com',
  '$2b$10$e7UCMUCm2ar7lD5Y82p2qOmXfKqJUl40OI5QxHC6vJKWYmEzH8QNy',
  'ADMIN',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;
