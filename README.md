Source sẽ bao gồm cả backend ( NestJS + Prisma + Postgresql) và frontend (NextJs)
khởi tạo backend :
Bước 1 : cd api && cp .env.example .env && npm install ( trỏ vào thư mục api và install thư viện)
Bước 2: Khởi tạo server được bọc trong docker :
docker compose up -d --wait && npx prisma migrate deploy && npm run prisma:seed
Bước 3 : chạy ở môi trường dev .
npm run start:dev  
Khởi tạo frontend :
Bước 1: cd web && cp .env.example .env.local && npm install ( trỏ vào thư mục web và install thư viện)
Bước 2: npm run dev : chạy trên môi trường dev
