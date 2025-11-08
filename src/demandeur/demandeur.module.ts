import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Demandeur } from './demandeur.entity';
import { DemandeurService } from './demandeur.service';
import { DemandeurController } from './demandeur.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Demandeur])],
  controllers: [DemandeurController],
  providers: [DemandeurService],
})
export class DemandeurModule {}
