import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeComptabiliteController } from './typecompta.controller';
import { TypeComptabiliteService } from './typecompta.service';
import { TypeComptabilite } from './typecompta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TypeComptabilite])],
  controllers: [TypeComptabiliteController],
  providers: [TypeComptabiliteService],
  exports: [TypeComptabiliteService],
})
export class TypeComptabiliteModule {}
