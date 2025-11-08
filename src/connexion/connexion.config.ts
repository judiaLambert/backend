import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const connexionConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '1235',
  database: 'gestionstock_db',
  autoLoadEntities: true,
  synchronize: false,
};
